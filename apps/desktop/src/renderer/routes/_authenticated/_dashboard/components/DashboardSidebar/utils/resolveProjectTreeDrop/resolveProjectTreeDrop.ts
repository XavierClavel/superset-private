import type {
	ProjectTreeDropTarget,
	ProjectTreeItemRef,
} from "renderer/routes/_authenticated/hooks/useDashboardSidebarState/utils/projectFolderMutations";
import type { SidebarProjectListSortMode } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import type { ProjectTreeRow } from "../buildSidebarProjectTree";

/** Top and bottom share of a folder header that places beside it, not inside. */
const FOLDER_EDGE_RATIO = 0.25;

/** The drop zone below the list: the last place at the top level. */
export const PROJECT_TREE_END_ID = "ptree::end";

export type ProjectTreeDropIndicatorKind = "before" | "after" | "inside";

export interface ProjectTreeDropIndicator {
	rowId: string;
	kind: ProjectTreeDropIndicatorKind;
}

export interface ProjectTreeDrop {
	target: ProjectTreeDropTarget;
	/** Null when no row marks the target (top level in name order). */
	indicator: ProjectTreeDropIndicator | null;
}

interface ResolveProjectTreeDropInput {
	rows: readonly ProjectTreeRow[];
	collapsedFolderIds: ReadonlySet<string>;
	active: ProjectTreeItemRef;
	overId: string;
	/** Pointer height inside the hovered row: 0 = top edge, 1 = bottom edge. */
	pointerRatio: number;
	sortMode?: SidebarProjectListSortMode;
}

function isInsideFolder(
	parentById: ReadonlyMap<string, string | null>,
	rowId: string,
	folderId: string,
): boolean {
	const visited = new Set<string>();
	let current: string | null = rowId;
	while (current !== null && !visited.has(current)) {
		if (current === folderId) return true;
		visited.add(current);
		current = parentById.get(current) ?? null;
	}
	return false;
}

function dropInside(folderId: string): ProjectTreeDrop {
	return {
		target: { parentFolderId: folderId, position: { kind: "start" } },
		indicator: { rowId: folderId, kind: "inside" },
	};
}

function dropBeside(row: ProjectTreeRow, kind: "before" | "after") {
	return {
		target: {
			parentFolderId: row.parentFolderId,
			position: { kind, anchorId: row.id },
		},
		indicator: { rowId: row.id, kind },
	};
}

function resolveFolderRowDrop(
	row: ProjectTreeRow,
	pointerRatio: number,
	isCollapsed: boolean,
): ProjectTreeDrop {
	if (pointerRatio < FOLDER_EDGE_RATIO) return dropBeside(row, "before");
	if (isCollapsed && pointerRatio > 1 - FOLDER_EDGE_RATIO) {
		return dropBeside(row, "after");
	}
	return dropInside(row.id);
}

/**
 * In name order the position inside a level is not the user's to choose: a
 * drop only picks the folder, so the target is the folder itself.
 */
function resolveNameOrderDrop(row: ProjectTreeRow): ProjectTreeDrop {
	if (row.type === "folder") return dropInside(row.id);
	return {
		target: { parentFolderId: row.parentFolderId, position: { kind: "end" } },
		indicator:
			row.parentFolderId === null
				? null
				: { rowId: row.parentFolderId, kind: "inside" },
	};
}

/**
 * Turns the hovered row and pointer height into a move target. Null means the
 * drop is not allowed (a folder into itself or its descendants) or the row is
 * unknown.
 */
export function resolveProjectTreeDrop({
	rows,
	collapsedFolderIds,
	active,
	overId,
	pointerRatio,
	sortMode = "manual",
}: ResolveProjectTreeDropInput): ProjectTreeDrop | null {
	if (overId === PROJECT_TREE_END_ID) {
		return {
			target: { parentFolderId: null, position: { kind: "end" } },
			indicator: { rowId: PROJECT_TREE_END_ID, kind: "before" },
		};
	}
	const row = rows.find((candidate) => candidate.id === overId);
	if (!row || row.id === active.id) return null;

	const drop: ProjectTreeDrop =
		sortMode === "name"
			? resolveNameOrderDrop(row)
			: row.type === "folder"
				? resolveFolderRowDrop(
						row,
						pointerRatio,
						collapsedFolderIds.has(row.id),
					)
				: dropBeside(row, pointerRatio < 0.5 ? "before" : "after");

	if (active.type === "folder") {
		const parentById = new Map(
			rows.map((candidate) => [candidate.id, candidate.parentFolderId]),
		);
		const parentFolderId = drop.target.parentFolderId;
		if (
			parentFolderId !== null &&
			isInsideFolder(parentById, parentFolderId, active.id)
		) {
			return null;
		}
	}
	return drop;
}
