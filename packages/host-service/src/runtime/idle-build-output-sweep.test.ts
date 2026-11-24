import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { DEFAULT_IDLE_BUILD_OUTPUT_DAYS } from "@superset/shared/idle-build-output";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../db/schema";
import { idleBuildOutputCleanupRouter } from "../trpc/router/settings/idle-build-output-cleanup";
import type { HostServiceContext } from "../types";
import {
	idleBuildOutputOps,
	sweepIdleBuildOutput,
} from "./idle-build-output-sweep";

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../drizzle");
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const AFTER_DAYS = 3;
const IDLE = NOW - AFTER_DAYS * DAY_MS - 1;
const RECENT = NOW - AFTER_DAYS * DAY_MS + 1;

function createTestDb() {
	const db = drizzle(new Database(":memory:"), { schema });
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	db.insert(schema.projects).values({ id: "p", repoPath: "/repo" }).run();
	return db;
}

type TestDb = ReturnType<typeof createTestDb>;

function seedWorkspace(
	db: TestDb,
	worktreePath: string,
	values: Partial<typeof schema.workspaces.$inferInsert> = {},
) {
	db.insert(schema.workspaces)
		.values({
			id: worktreePath,
			projectId: "p",
			worktreePath,
			branch: worktreePath,
			lastActivityAt: IDLE,
			...values,
		})
		.run();
}

describe("sweepIdleBuildOutput", () => {
	const original = { ...idleBuildOutputOps };
	let db: TestDb;
	let ctx: Pick<HostServiceContext, "db" | "credentials">;

	beforeEach(() => {
		db = createTestDb();
		ctx = { db } as unknown as Pick<HostServiceContext, "db" | "credentials">;
		idleBuildOutputOps.resolveGitEnv = async () => ({});
		idleBuildOutputOps.removeIgnoredDirs = async () => ({
			removed: ["node_modules/"],
		});
	});

	afterEach(() => {
		Object.assign(idleBuildOutputOps, original);
	});

	function caller() {
		return idleBuildOutputCleanupRouter.createCaller({
			db,
			isAuthenticated: true,
		} as unknown as HostServiceContext);
	}

	test("cleans worktrees idle for the configured number of days", async () => {
		db.insert(schema.hostSettings)
			.values({
				id: 1,
				cleanIdleBuildOutput: true,
				idleBuildOutputDays: AFTER_DAYS,
			})
			.run();
		const idle = "/wt/idle";
		const idleSinceUpdate = "/wt/idle-since-update";
		seedWorkspace(db, idle);
		seedWorkspace(db, idleSinceUpdate, {
			lastActivityAt: null,
			updatedAt: IDLE,
		});
		seedWorkspace(db, "/wt/recent", { lastActivityAt: RECENT });
		seedWorkspace(db, "/wt/archived", { archivedAt: IDLE });
		seedWorkspace(db, "/repo", { type: "local" });
		seedWorkspace(db, "/wt/terminal-open");
		db.insert(schema.terminalSessions)
			.values({ id: "t", originWorkspaceId: "/wt/terminal-open" })
			.run();

		const cleaned = await sweepIdleBuildOutput(ctx, NOW);

		expect(cleaned.sort()).toEqual([idle, idleSinceUpdate].sort());
	});

	test("does nothing while the setting is off", async () => {
		db.insert(schema.hostSettings)
			.values({
				id: 1,
				cleanIdleBuildOutput: false,
				idleBuildOutputDays: AFTER_DAYS,
			})
			.run();
		seedWorkspace(db, "/wt/idle");

		expect(await sweepIdleBuildOutput(ctx, NOW)).toEqual([]);
	});

	test("is off by default, and each field can be set alone", async () => {
		expect(await caller().get()).toEqual({
			enabled: false,
			afterDays: DEFAULT_IDLE_BUILD_OUTPUT_DAYS,
		});

		await caller().set({ enabled: true });
		await caller().set({ afterDays: AFTER_DAYS });
		expect(await caller().get()).toEqual({
			enabled: true,
			afterDays: AFTER_DAYS,
		});

		await caller().set({ enabled: false });
		expect(await caller().get()).toEqual({
			enabled: false,
			afterDays: AFTER_DAYS,
		});
	});
});
