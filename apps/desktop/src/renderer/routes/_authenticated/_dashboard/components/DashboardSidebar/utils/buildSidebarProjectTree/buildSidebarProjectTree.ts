import type { SidebarProjectListSortMode } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";
import type {
	DashboardSidebarProject,
	DashboardSidebarProjectFolder,
	DashboardSidebarProjectPlacement,
	DashboardSidebarProjectTreeNode,
} from "../../types";

interface BuildSidebarProjectTreeInput {
	/** The projects to place, in their current order. */
	projects: readonly DashboardSidebarProject[];
	folders: readonly DashboardSidebarProjectFolder[];
	placements: ReadonlyMap<string, DashboardSidebarProjectPlacement>;
	sortMode: SidebarProjectListSortMode;
	/** Drops folders that hold no project, at any depth (used while filtering). */
	pruneEmptyFolders?: boolean;
}

export interface ProjectTreeRow {
	type: "folder" | "project";
	id: string;
	parentFolderId: string | null;
	depth: number;
}

interface SortableEntry {
	node: DashboardSidebarProjectTreeNode;
	name: string;
	tabOrder: number;
	inputIndex: number;
}

const nameCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base",
});

function isFolderEntry(entry: SortableEntry): boolean {
	return entry.node.type === "folder";
}

function compareFoldersFirst(left: SortableEntry, right: SortableEntry) {
	return Number(isFolderEntry(right)) - Number(isFolderEntry(left));
}

function compareEntries(
	sortMode: SidebarProjectListSortMode,
): (left: SortableEntry, right: SortableEntry) => number {
	if (sortMode === "name") {
		return (left, right) =>
			compareFoldersFirst(left, right) ||
			nameCollator.compare(left.name, right.name) ||
			left.inputIndex - right.inputIndex;
	}
	return (left, right) =>
		left.tabOrder - right.tabOrder ||
		compareFoldersFirst(left, right) ||
		left.inputIndex - right.inputIndex;
}

/**
 * Resolves each folder's effective parent. A missing parent, or a parent
 * chain that loops back on itself, puts the folder at the top level so no
 * folder is ever lost from the sidebar.
 */
function resolveFolderParents(
	folders: readonly DashboardSidebarProjectFolder[],
): Map<string, string | null> {
	const byId = new Map(folders.map((folder) => [folder.id, folder]));
	const parents = new Map<string, string | null>();
	for (const folder of folders) {
		const visited = new Set<string>([folder.id]);
		let current = folder.parentFolderId;
		let reachesRoot = true;
		while (current !== null) {
			const parent = byId.get(current);
			if (!parent) break;
			if (visited.has(current)) {
				reachesRoot = false;
				break;
			}
			visited.add(current);
			current = parent.parentFolderId;
		}
		const parentId =
			folder.parentFolderId !== null && byId.has(folder.parentFolderId)
				? folder.parentFolderId
				: null;
		parents.set(folder.id, reachesRoot ? parentId : null);
	}
	return parents;
}

function countProjects(nodes: readonly DashboardSidebarProjectTreeNode[]) {
	return nodes.reduce(
		(total, node) => total + (node.type === "project" ? 1 : node.projectCount),
		0,
	);
}

export function buildSidebarProjectTree({
	projects,
	folders,
	placements,
	sortMode,
	pruneEmptyFolders = false,
}: BuildSidebarProjectTreeInput): DashboardSidebarProjectTreeNode[] {
	const folderParents = resolveFolderParents(folders);
	const folderIds = new Set(folders.map((folder) => folder.id));
	const entriesByParent = new Map<string | null, SortableEntry[]>();
	const addEntry = (parentId: string | null, entry: SortableEntry) => {
		const list = entriesByParent.get(parentId);
		if (list) list.push(entry);
		else entriesByParent.set(parentId, [entry]);
	};

	projects.forEach((project, inputIndex) => {
		const placement = placements.get(project.id);
		const folderId =
			placement?.folderId && folderIds.has(placement.folderId)
				? placement.folderId
				: null;
		addEntry(folderId, {
			node: { type: "project", project },
			name: project.name,
			tabOrder: placement?.tabOrder ?? Number.MAX_SAFE_INTEGER,
			inputIndex,
		});
	});

	const compare = compareEntries(sortMode);
	const build = (
		parentId: string | null,
		ancestors: ReadonlySet<string>,
	): DashboardSidebarProjectTreeNode[] => {
		const folderEntries = folders.flatMap(
			(folder, inputIndex): SortableEntry[] => {
				if (folderParents.get(folder.id) !== parentId) return [];
				if (ancestors.has(folder.id)) return [];
				const children = build(folder.id, new Set([...ancestors, folder.id]));
				const projectCount = countProjects(children);
				if (pruneEmptyFolders && projectCount === 0) return [];
				return [
					{
						node: { type: "folder", folder, children, projectCount },
						name: folder.name,
						tabOrder: folder.tabOrder,
						inputIndex,
					},
				];
			},
		);
		return [...folderEntries, ...(entriesByParent.get(parentId) ?? [])]
			.sort(compare)
			.map((entry) => entry.node);
	};

	return build(null, new Set());
}

/** Every project in tree order, including those in collapsed folders. */
export function flattenSidebarProjectTree(
	nodes: readonly DashboardSidebarProjectTreeNode[],
): DashboardSidebarProject[] {
	return nodes.flatMap((node) =>
		node.type === "project"
			? [node.project]
			: flattenSidebarProjectTree(node.children),
	);
}

/** Projects on screen: those inside a collapsed folder are left out. */
export function flattenOpenSidebarProjectTree(
	nodes: readonly DashboardSidebarProjectTreeNode[],
): DashboardSidebarProject[] {
	return nodes.flatMap((node) => {
		if (node.type === "project") return [node.project];
		return node.folder.isCollapsed
			? []
			: flattenOpenSidebarProjectTree(node.children);
	});
}

/** The rows on screen, top to bottom: collapsed folders hide their contents. */
export function listVisibleProjectTreeRows(
	nodes: readonly DashboardSidebarProjectTreeNode[],
	{ forceExpanded = false }: { forceExpanded?: boolean } = {},
	parentFolderId: string | null = null,
	depth = 0,
): ProjectTreeRow[] {
	return nodes.flatMap((node): ProjectTreeRow[] => {
		if (node.type === "project") {
			return [{ type: "project", id: node.project.id, parentFolderId, depth }];
		}
		const row: ProjectTreeRow = {
			type: "folder",
			id: node.folder.id,
			parentFolderId,
			depth,
		};
		if (node.folder.isCollapsed && !forceExpanded) return [row];
		return [
			row,
			...listVisibleProjectTreeRows(
				node.children,
				{ forceExpanded },
				node.folder.id,
				depth + 1,
			),
		];
	});
}
