import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createWorkspaceLabel,
	deleteWorkspaceLabel,
	listWorkspaceLabels,
	setWorkspaceLabels,
	updateWorkspaceLabel,
	WORKSPACE_LABEL_NAME_MAX_LENGTH,
	WorkspaceLabelNameConflictError,
	WorkspaceLabelNotFoundError,
} from "../../../workspace-labels";
import { protectedProcedure, router } from "../../index";

const nameSchema = z
	.string()
	.trim()
	.min(1)
	.max(WORKSPACE_LABEL_NAME_MAX_LENGTH);
const colorSchema = z.string().min(1).max(50);

function mapStoreError(error: unknown): never {
	if (error instanceof WorkspaceLabelNameConflictError) {
		throw new TRPCError({ code: "CONFLICT", message: error.message });
	}
	if (error instanceof WorkspaceLabelNotFoundError) {
		throw new TRPCError({ code: "NOT_FOUND", message: error.message });
	}
	throw error;
}

function run<T>(fn: () => T): T {
	try {
		return fn();
	} catch (error) {
		return mapStoreError(error);
	}
}

export const workspaceLabelsRouter = router({
	list: protectedProcedure.query(({ ctx }) =>
		listWorkspaceLabels({ db: ctx.db, userId: ctx.userId }),
	),

	create: protectedProcedure
		.input(z.object({ name: nameSchema, color: colorSchema }))
		.mutation(({ ctx, input }) =>
			run(() =>
				createWorkspaceLabel({ db: ctx.db, userId: ctx.userId }, input),
			),
		),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				name: nameSchema.optional(),
				color: colorSchema.optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			run(() =>
				updateWorkspaceLabel({ db: ctx.db, userId: ctx.userId }, input.id, {
					name: input.name,
					color: input.color,
				}),
			),
		),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(({ ctx, input }) => {
			run(() =>
				deleteWorkspaceLabel({ db: ctx.db, userId: ctx.userId }, input.id),
			);
			return { success: true as const };
		}),

	setForWorkspace: protectedProcedure
		.input(
			z.object({
				workspaceId: z.string().min(1),
				labelIds: z.array(z.string().uuid()).max(50),
			}),
		)
		.mutation(({ ctx, input }) =>
			run(() =>
				setWorkspaceLabels(
					{ db: ctx.db, userId: ctx.userId },
					input.workspaceId,
					input.labelIds,
				),
			),
		),
});
