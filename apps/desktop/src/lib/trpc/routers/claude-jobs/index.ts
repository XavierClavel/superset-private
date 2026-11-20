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

/** The first version with every command used here: `delete` came in 0.15.0. */
const MIN_CLAUDE_JOBS_VERSION = "0.15.0";
const STATUS_VERSION = 1;

const jobInput = z.object({ id: z.string().min(1) });

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

	return router({
		status: publicProcedure.query(async (): Promise<ClaudeJobsStatus> => {
			const version = await cli.version();
			if (version === null) return { state: "missing" };
			if (!isAtLeast(version, MIN_CLAUDE_JOBS_VERSION)) {
				return { state: "outdated", version };
			}
			const status = JSON.parse(await run(["status"])) as {
				version: number;
				jobs: ClaudeJob[];
			};
			if (status.version !== STATUS_VERSION) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: i18n._(
						msg({
							message:
								"This version of Claude Jobs is newer than Paradev reads.",
						}),
					),
				});
			}
			return { state: "ready", jobs: status.jobs };
		}),

		start: publicProcedure.input(jobInput).mutation(async ({ input }) => {
			await run(["start", input.id]);
		}),

		setEnabled: publicProcedure
			.input(jobInput.extend({ enabled: z.boolean() }))
			.mutation(async ({ input }) => {
				await run(["save"], JSON.stringify(input));
			}),

		delete: publicProcedure.input(jobInput).mutation(async ({ input }) => {
			await run(["delete", input.id]);
		}),

		open: publicProcedure.mutation(() => cli.open()),
	});
}
