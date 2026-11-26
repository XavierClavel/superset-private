import type { DashboardSidebarProjectFolder } from "../../../../types";
import {
	buildSidebarProjectTree,
	listVisibleProjectTreeRows,
} from "../../../../utils/buildSidebarProjectTree";

export interface FolderMenuEntry {
	folder: DashboardSidebarProjectFolder;
	depth: number;
}

/**
 * Every folder as a move target, in A–Z tree order with its depth. Leaves out
 * `excludeFolderId` and everything nested in it: a folder cannot move into
 * itself.
 */
export function listFolderMenuEntries(
	folders: readonly DashboardSidebarProjectFolder[],
	excludeFolderId: string | null,
): FolderMenuEntry[] {
	const byId = new Map(folders.map((folder) => [folder.id, folder]));
	const rows = listVisibleProjectTreeRows(
		buildSidebarProjectTree({
			projects: [],
			folders,
			placements: new Map(),
			sortMode: "name",
		}),
		{ forceExpanded: true },
	);
	const excluded = new Set<string>();
	return rows.flatMap((row): FolderMenuEntry[] => {
		if (
			row.id === excludeFolderId ||
			(row.parentFolderId !== null && excluded.has(row.parentFolderId))
		) {
			excluded.add(row.id);
			return [];
		}
		const folder = byId.get(row.id);
		return folder ? [{ folder, depth: row.depth }] : [];
	});
}
