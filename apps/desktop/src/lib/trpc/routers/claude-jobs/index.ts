import { homedir } from "node:os";
import { join } from "node:path";
import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import type { ClaudeJob, ClaudeJobsStatus } from "./types";
import {
	type ClaudeJobsCli,
	createClaudeJobsCli,
} from "./utils/claude-jobs-cli";
import { jobIdFor } from "./utils/job-id";

/** The first version with every command used here: `delete` came in 0.15.0. */
const MIN_CLAUDE_JOBS_VERSION = "0.15.0";
const STATUS_VERSION = 1;

const jobInput = z.object({ id: z.string().min(1) });

const saveInput = z.object({
	id: z.string().min(1).optional(),
	name: z.string().trim().min(1),
	prompt: z.string().trim().min(1),
	hour: z.number().int().min(0).max(23),
	minute: z.number().int().min(0).max(59),
	weekdays: z.array(z.number().int().min(1).max(7)),
	month_days: z.array(z.number().int().min(1).max(31)),
	cron: z.string().trim().min(1).nullable(),
	cwd: z.string().min(1).nullable(),
});

function isAtLeast(version: string, minimum: string): boolean {
	const parts = version.split(".").map(Number);
	const minimumParts = minimum.split(".").map(Number);
	for (const [index, part] of minimumParts.entries()) {
		const own = parts[index] ?? 0;
		if (own !== part) return own > part;
	}
	return true;
}

/**
 * Automations for organizations whose plan has none in the cloud: the jobs of
 * Claude Jobs, a macOS app that runs Claude Code on a schedule with launchd.
 */
export function createClaudeJobsRouter(
	cli: ClaudeJobsCli = createClaudeJobsCli(),
	defaultCwd = join(homedir(), ".claude-jobs", "workspace"),
) {
	// An older binary opens its window on a command it does not know.
	async function run(args: string[], input?: string): Promise<string> {
		const version = await cli.version();
		if (version !== null && !isAtLeast(version, MIN_CLAUDE_JOBS_VERSION)) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: i18n._(
					msg({
						message: `Update Claude Jobs to ${MIN_CLAUDE_JOBS_VERSION} or later.`,
					}),
				),
			});
		}
		return cli.run(args, input);
	}

	async function readJobs(): Promise<ClaudeJob[]> {
		const status = JSON.parse(await run(["status"])) as {
			version: number;
			jobs: ClaudeJob[];
		};
		if (status.version !== STATUS_VERSION) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: i18n._(
					msg({
						message: "This version of Claude Jobs is newer than Paradev reads.",
					}),
				),
			});
		}
		return status.jobs.map((job) =>
			job.cwd === defaultCwd ? { ...job, cwd: null } : job,
		);
	}

	return router({
		status: publicProcedure.query(async (): Promise<ClaudeJobsStatus> => {
			const version = await cli.version();
			if (version === null) return { state: "missing" };
			if (!isAtLeast(version, MIN_CLAUDE_JOBS_VERSION)) {
				return { state: "outdated", version };
			}
			return { state: "ready", jobs: await readJobs() };
		}),

		start: publicProcedure.input(jobInput).mutation(async ({ input }) => {
			await run(["start", input.id]);
		}),

		setEnabled: publicProcedure
			.input(jobInput.extend({ enabled: z.boolean() }))
			.mutation(async ({ input }) => {
				await run(["save"], JSON.stringify(input));
			}),

		save: publicProcedure.input(saveInput).mutation(async ({ input }) => {
			const id =
				input.id ??
				jobIdFor(
					input.name,
					(await readJobs()).map((job) => job.id),
				);
			await run(
				["save"],
				JSON.stringify({ ...input, id, cwd: input.cwd ?? defaultCwd }),
			);
			return { id };
		}),

		delete: publicProcedure.input(jobInput).mutation(async ({ input }) => {
			await run(["delete", input.id]);
		}),

		open: publicProcedure.mutation(() => cli.open()),
	});
}
