import type { ClientRect, UniqueIdentifier } from "@dnd-kit/core";
import type { ProjectTreeItemRef } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState/utils/projectFolderMutations";
import type { SidebarProjectListSortMode } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import type { ProjectTreeRow } from "../../utils/buildSidebarProjectTree";
import {
	PROJECT_TREE_END_ID,
	type ProjectTreeDrop,
	resolveProjectTreeDrop,
} from "../../utils/resolveProjectTreeDrop";

const PROJECT_FOLDER = "pfolder::";

export const projectFolderDndId = (folderId: string) =>
	`${PROJECT_FOLDER}${folderId}`;

export const parseProjectFolderDndId = (
	id: UniqueIdentifier,
): string | null => {
	const s = String(id);
	return s.startsWith(PROJECT_FOLDER) ? s.slice(PROJECT_FOLDER.length) : null;
};

/** The dnd id a project tree row registers under. */
export const projectTreeRowDndId = (row: ProjectTreeRow): string =>
	row.type === "folder" ? projectFolderDndId(row.id) : row.id;

/** Maps a project-tree dnd id back to its item; null for any other id. */
export function toProjectTreeItem(
	id: UniqueIdentifier,
	projectIds: ReadonlySet<string>,
): ProjectTreeItemRef | null {
	const folderId = parseProjectFolderDndId(id);
	if (folderId) return { type: "folder", id: folderId };
	const s = String(id);
	return projectIds.has(s) ? { type: "project", id: s } : null;
}

interface DragPointerEvent {
	activatorEvent: Event | null;
	delta: { x: number; y: number };
	active: { rect: { current: { translated: ClientRect | null } } };
}

function getActivatorClientY(event: Event | null): number | null {
	if (!event) return null;
	if ("clientY" in event && typeof event.clientY === "number") {
		return event.clientY;
	}
	if ("touches" in event) {
		const touches = (event as TouchEvent).touches;
		const touch = touches[0] ?? (event as TouchEvent).changedTouches[0];
		return touch ? touch.clientY : null;
	}
	return null;
}

/**
 * Current pointer height: the pick-up point plus the drag delta. The ghost
 * center is no proxy, as a project ghost is much taller than the row under the
 * pointer. Null for a keyboard drag, which has no pointer.
 */
export function getDragPointerY(event: DragPointerEvent): number | null {
	const startY = getActivatorClientY(event.activatorEvent);
	return startY === null ? null : startY + event.delta.y;
}

interface ComputeProjectTreeDropInput {
	rows: readonly ProjectTreeRow[];
	collapsedFolderIds: ReadonlySet<string>;
	active: ProjectTreeItemRef;
	overId: UniqueIdentifier;
	overRect: ClientRect;
	/** Null (keyboard drag) resolves as the middle of the row. */
	pointerY: number | null;
	projectIds: ReadonlySet<string>;
	sortMode: SidebarProjectListSortMode;
}

export function computeProjectTreeDrop({
	rows,
	collapsedFolderIds,
	active,
	overId,
	overRect,
	pointerY,
	projectIds,
	sortMode,
}: ComputeProjectTreeDropInput): ProjectTreeDrop | null {
	const over =
		overId === PROJECT_TREE_END_ID
			? { id: PROJECT_TREE_END_ID }
			: toProjectTreeItem(overId, projectIds);
	if (!over) return null;
	const pointerRatio =
		pointerY === null || overRect.height <= 0
			? 0.5
			: Math.min(1, Math.max(0, (pointerY - overRect.top) / overRect.height));
	return resolveProjectTreeDrop({
		rows,
		collapsedFolderIds,
		active,
		overId: over.id,
		pointerRatio,
		sortMode,
	});
}

/** Ids of the folder and everything inside it, as dnd ids. */
export function getProjectTreeDescendantDndIds(
	rows: readonly ProjectTreeRow[],
	folderId: string,
): Set<string> {
	const insideIds = new Set<string>([folderId]);
	const result = new Set<string>([projectFolderDndId(folderId)]);
	for (const row of rows) {
		if (row.parentFolderId !== null && insideIds.has(row.parentFolderId)) {
			if (row.type === "folder") insideIds.add(row.id);
			result.add(projectTreeRowDndId(row));
		}
	}
	return result;
}
