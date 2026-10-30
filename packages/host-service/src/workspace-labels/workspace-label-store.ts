import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { HostDb } from "../db";
import {
	workspaceLabelAssignments,
	workspaceLabels,
	workspaces,
} from "../db/schema";

export const WORKSPACE_LABEL_NAME_MAX_LENGTH = 40;

export interface WorkspaceLabelSnapshot {
	id: string;
	name: string;
	color: string;
	sortOrder: number;
}

export interface WorkspaceLabelAssignment {
	workspaceId: string;
	labelId: string;
}

export interface WorkspaceLabelStoreContext {
	db: HostDb;
	userId: string | null | undefined;
}

export class WorkspaceLabelNameConflictError extends Error {}
export class WorkspaceLabelNotFoundError extends Error {}

type WorkspaceLabelRow = typeof workspaceLabels.$inferSelect;

function owner(ctx: WorkspaceLabelStoreContext): string {
	return ctx.userId ?? "";
}

function toSnapshot(row: WorkspaceLabelRow): WorkspaceLabelSnapshot {
	return {
		id: row.id,
		name: row.name,
		color: row.color,
		sortOrder: row.sortOrder,
	};
}

function normalizeName(rawName: string): { name: string; nameKey: string } {
	const name = rawName.trim();
	if (name.length < 1 || name.length > WORKSPACE_LABEL_NAME_MAX_LENGTH) {
		throw new RangeError(
			`Label name must be 1-${WORKSPACE_LABEL_NAME_MAX_LENGTH} characters`,
		);
	}
	return { name, nameKey: name.toLowerCase() };
}

function ownedLabel(
	ctx: WorkspaceLabelStoreContext,
	id: string,
): WorkspaceLabelRow {
	const row = ctx.db
		.select()
		.from(workspaceLabels)
		.where(
			and(
				eq(workspaceLabels.id, id),
				eq(workspaceLabels.createdByUserId, owner(ctx)),
			),
		)
		.all()[0];
	if (!row) throw new WorkspaceLabelNotFoundError(`Label not found: ${id}`);
	return row;
}

function assertNameFree(
	ctx: WorkspaceLabelStoreContext,
	nameKey: string,
	exceptId?: string,
): void {
	const clash = ctx.db
		.select({ id: workspaceLabels.id })
		.from(workspaceLabels)
		.where(
			and(
				eq(workspaceLabels.createdByUserId, owner(ctx)),
				eq(workspaceLabels.nameKey, nameKey),
			),
		)
		.all()
		.find((row) => row.id !== exceptId);
	if (clash)
		throw new WorkspaceLabelNameConflictError("Label name already exists");
}

export function listWorkspaceLabels(ctx: WorkspaceLabelStoreContext): {
	labels: WorkspaceLabelSnapshot[];
	assignments: WorkspaceLabelAssignment[];
} {
	const rows = ctx.db
		.select()
		.from(workspaceLabels)
		.where(eq(workspaceLabels.createdByUserId, owner(ctx)))
		.orderBy(asc(workspaceLabels.sortOrder), asc(workspaceLabels.createdAt))
		.all();
	if (rows.length === 0) return { labels: [], assignments: [] };
	const assignments = ctx.db
		.select({
			workspaceId: workspaceLabelAssignments.workspaceId,
			labelId: workspaceLabelAssignments.labelId,
		})
		.from(workspaceLabelAssignments)
		.innerJoin(
			workspaces,
			eq(workspaces.id, workspaceLabelAssignments.workspaceId),
		)
		.where(
			and(
				inArray(
					workspaceLabelAssignments.labelId,
					rows.map((row) => row.id),
				),
				isNull(workspaces.archivedAt),
			),
		)
		.all();
	return { labels: rows.map(toSnapshot), assignments };
}

export function createWorkspaceLabel(
	ctx: WorkspaceLabelStoreContext,
	input: { name: string; color: string },
): WorkspaceLabelSnapshot {
	const { name, nameKey } = normalizeName(input.name);
	return ctx.db.transaction((tx) => {
		const txCtx = { ...ctx, db: tx as unknown as HostDb };
		assertNameFree(txCtx, nameKey);
		const top = tx
			.select({ value: max(workspaceLabels.sortOrder) })
			.from(workspaceLabels)
			.where(eq(workspaceLabels.createdByUserId, owner(ctx)))
			.all()[0]?.value;
		return toSnapshot(
			tx
				.insert(workspaceLabels)
				.values({
					id: randomUUID(),
					createdByUserId: owner(ctx),
					name,
					nameKey,
					color: input.color,
					sortOrder: top == null ? 0 : top + 1,
				})
				.returning()
				.all()[0] as WorkspaceLabelRow,
		);
	});
}

export function updateWorkspaceLabel(
	ctx: WorkspaceLabelStoreContext,
	id: string,
	patch: { name?: string; color?: string },
): WorkspaceLabelSnapshot {
	const existing = ownedLabel(ctx, id);
	const next = patch.name === undefined ? undefined : normalizeName(patch.name);
	if (next) assertNameFree(ctx, next.nameKey, id);
	ctx.db
		.update(workspaceLabels)
		.set({
			name: next?.name ?? existing.name,
			nameKey: next?.nameKey ?? existing.nameKey,
			color: patch.color ?? existing.color,
		})
		.where(eq(workspaceLabels.id, id))
		.run();
	return toSnapshot(ownedLabel(ctx, id));
}

export function deleteWorkspaceLabel(
	ctx: WorkspaceLabelStoreContext,
	id: string,
): void {
	ownedLabel(ctx, id);
	ctx.db.delete(workspaceLabels).where(eq(workspaceLabels.id, id)).run();
}

export function setWorkspaceLabels(
	ctx: WorkspaceLabelStoreContext,
	workspaceId: string,
	labelIds: string[],
): WorkspaceLabelAssignment[] {
	const wanted = [...new Set(labelIds)];
	const exists = ctx.db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.all()[0];
	if (!exists) {
		throw new WorkspaceLabelNotFoundError(
			`Workspace not found: ${workspaceId}`,
		);
	}
	const ownedIds = ctx.db
		.select({ id: workspaceLabels.id })
		.from(workspaceLabels)
		.where(eq(workspaceLabels.createdByUserId, owner(ctx)))
		.all()
		.map((row) => row.id);
	const unknown = wanted.find((id) => !ownedIds.includes(id));
	if (unknown !== undefined) {
		throw new WorkspaceLabelNotFoundError(`Label not found: ${unknown}`);
	}
	ctx.db.transaction((tx) => {
		if (ownedIds.length > 0) {
			tx.delete(workspaceLabelAssignments)
				.where(
					and(
						eq(workspaceLabelAssignments.workspaceId, workspaceId),
						inArray(workspaceLabelAssignments.labelId, ownedIds),
					),
				)
				.run();
		}
		if (wanted.length > 0) {
			tx.insert(workspaceLabelAssignments)
				.values(wanted.map((labelId) => ({ workspaceId, labelId })))
				.run();
		}
	});
	return wanted.map((labelId) => ({ workspaceId, labelId }));
}
