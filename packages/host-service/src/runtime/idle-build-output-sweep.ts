import { DEFAULT_IDLE_BUILD_OUTPUT_DAYS } from "@superset/shared/idle-build-output";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import type { HostDb } from "../db";
import { hostSettings, terminalSessions, workspaces } from "../db/schema";
import type { HostServiceContext } from "../types";
import { getHostWorkerPool } from "../workers/host-worker-pool";
import {
	type GitTaskEnv,
	gitRemoveIgnoredDirsTask,
} from "../workers/tasks/git";
import { createGitEnvResolver } from "./git/git";

const DAY_MS = 24 * 60 * 60 * 1000;

export const IDLE_BUILD_OUTPUT_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const BUILD_OUTPUT_DIR_NAMES = [
	"node_modules",
	"target",
	"build",
	".gradle",
	".next",
	".turbo",
	".build",
	"DerivedData",
];

type SweepContext = Pick<HostServiceContext, "db" | "credentials">;

// A mutable object so tests can replace the git work without mock.module.
export const idleBuildOutputOps = {
	resolveGitEnv(ctx: SweepContext, worktreePath: string): Promise<GitTaskEnv> {
		return createGitEnvResolver(ctx.credentials)(worktreePath);
	},

	removeIgnoredDirs(input: {
		worktreePath: string;
		gitEnv: GitTaskEnv;
		dirNames: string[];
	}): Promise<{ removed: string[] }> {
		return getHostWorkerPool().run(gitRemoveIgnoredDirsTask, input, {
			timeoutMs: 300_000,
		});
	},
};

export interface IdleBuildOutputSettings {
	enabled: boolean;
	afterDays: number;
}

export function readIdleBuildOutputSettings(
	db: HostDb,
): IdleBuildOutputSettings {
	const row = db
		.select({
			enabled: hostSettings.cleanIdleBuildOutput,
			afterDays: hostSettings.idleBuildOutputDays,
		})
		.from(hostSettings)
		.get();
	return row ?? { enabled: false, afterDays: DEFAULT_IDLE_BUILD_OUTPUT_DAYS };
}

/**
 * Deletes the git-ignored build folders of worktrees with no activity for the
 * configured number of days. A workspace with an active terminal is skipped,
 * because a process in it can still use those folders.
 */
export async function sweepIdleBuildOutput(
	ctx: SweepContext,
	now = Date.now(),
): Promise<string[]> {
	const { enabled, afterDays } = readIdleBuildOutputSettings(ctx.db);
	if (!enabled) return [];

	const busy = new Set(
		ctx.db
			.select({ workspaceId: terminalSessions.originWorkspaceId })
			.from(terminalSessions)
			.where(eq(terminalSessions.status, "active"))
			.all()
			.map((row) => row.workspaceId),
	);
	const idle = ctx.db
		.select({ id: workspaces.id, worktreePath: workspaces.worktreePath })
		.from(workspaces)
		.where(
			and(
				eq(workspaces.type, "worktree"),
				isNull(workspaces.archivedAt),
				lt(
					sql`coalesce(${workspaces.lastActivityAt}, ${workspaces.updatedAt})`,
					now - afterDays * DAY_MS,
				),
			),
		)
		.all()
		.filter((workspace) => !busy.has(workspace.id));

	const cleaned: string[] = [];
	for (const { id, worktreePath } of idle) {
		try {
			const gitEnv = await idleBuildOutputOps.resolveGitEnv(ctx, worktreePath);
			const { removed } = await idleBuildOutputOps.removeIgnoredDirs({
				worktreePath,
				gitEnv,
				dirNames: BUILD_OUTPUT_DIR_NAMES,
			});
			if (removed.length === 0) continue;
			console.log("[idle-build-output-sweep] removed build output", {
				workspaceId: id,
				worktreePath,
				removed,
			});
			cleaned.push(worktreePath);
		} catch (error) {
			console.warn("[idle-build-output-sweep] cleanup failed", {
				workspaceId: id,
				worktreePath,
				error,
			});
		}
	}
	return cleaned;
}
