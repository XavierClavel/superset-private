import {
	MAX_IDLE_BUILD_OUTPUT_DAYS,
	MIN_IDLE_BUILD_OUTPUT_DAYS,
} from "@superset/shared/idle-build-output";
import { z } from "zod";
import { hostSettings } from "../../../db/schema";
import {
	readIdleBuildOutputSettings,
	sweepIdleBuildOutput,
} from "../../../runtime/idle-build-output-sweep";
import { protectedProcedure, router } from "../../index";

/**
 * Host-wide opt-in for deleting the ignored build folders of worktrees idle
 * for `afterDays`. Stored in the single-row `host_settings` table (`id = 1`).
 */
export const idleBuildOutputCleanupRouter = router({
	get: protectedProcedure.query(({ ctx }) =>
		readIdleBuildOutputSettings(ctx.db),
	),

	/** While it is on, every change runs a sweep at once. */
	set: protectedProcedure
		.input(
			z.object({
				enabled: z.boolean().optional(),
				afterDays: z
					.number()
					.int()
					.min(MIN_IDLE_BUILD_OUTPUT_DAYS)
					.max(MAX_IDLE_BUILD_OUTPUT_DAYS)
					.optional(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const current = readIdleBuildOutputSettings(ctx.db);
			const next = {
				enabled: input.enabled ?? current.enabled,
				afterDays: input.afterDays ?? current.afterDays,
			};
			const values = {
				cleanIdleBuildOutput: next.enabled,
				idleBuildOutputDays: next.afterDays,
			};
			ctx.db
				.insert(hostSettings)
				.values({ id: 1, ...values })
				.onConflictDoUpdate({ target: hostSettings.id, set: values })
				.run();
			if (next.enabled) {
				void sweepIdleBuildOutput(ctx).catch((error) => {
					console.warn("[idle-build-output-sweep] sweep failed:", error);
				});
			}
			return next;
		}),
});
