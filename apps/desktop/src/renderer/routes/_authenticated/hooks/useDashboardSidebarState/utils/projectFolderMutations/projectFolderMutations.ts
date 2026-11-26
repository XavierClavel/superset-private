import type { AppCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider/collections";
import { getPrependTabOrder } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import { updateRows } from "../../sidebarMutations";

export type ProjectFolderCollections = Pick<
	AppCollections,
	"sidebarProjects" | "sidebarProjectFolders"
>;

export type ProjectTreeItemType = "project" | "folder";

export interface ProjectTreeItemRef {
	type: ProjectTreeItemType;
	id: string;
}

interface ProjectTreeSibling extends ProjectTreeItemRef {
	tabOrder: number;
}

export type ProjectTreeDropPosition =
	| { kind: "before"; anchorId: string }
	| { kind: "after"; anchorId: string }
	| { kind: "start" }
	| { kind: "end" };

export interface ProjectTreeDropTarget {
	/** Null = top level. */
	parentFolderId: string | null;
	position: ProjectTreeDropPosition;
}

function compareSiblings(
	left: ProjectTreeSibling,
	right: ProjectTreeSibling,
): number {
	return (
		left.tabOrder - right.tabOrder ||
		(left.type === right.type ? 0 : left.type === "folder" ? -1 : 1) ||
		left.id.localeCompare(right.id)
	);
}

/** A parent id that does not resolve to a folder counts as top level. */
function resolveParentFolderId(
	collections: ProjectFolderCollections,
	folderId: string | null | undefined,
): string | null {
	if (!folderId) return null;
	return collections.sidebarProjectFolders.get(folderId) ? folderId : null;
}

/** Folders and projects of one level, in stored order. */
export function getProjectTreeSiblings(
	collections: ProjectFolderCollections,
	parentFolderId: string | null,
): ProjectTreeSibling[] {
	const folders = Array.from(collections.sidebarProjectFolders.state.values())
		.filter(
			(folder) =>
				resolveParentFolderId(collections, folder.parentFolderId) ===
				parentFolderId,
		)
		.map((folder) => ({
			type: "folder" as const,
			id: folder.folderId,
			tabOrder: folder.tabOrder,
		}));
	const projects = Array.from(collections.sidebarProjects.state.values())
		.filter(
			(project) =>
				resolveParentFolderId(collections, project.folderId) === parentFolderId,
		)
		.map((project) => ({
			type: "project" as const,
			id: project.projectId,
			tabOrder: project.tabOrder,
		}));
	return [...folders, ...projects].sort(compareSiblings);
}

function isFolderInside(
	collections: ProjectFolderCollections,
	folderId: string,
	ancestorId: string,
): boolean {
	const visited = new Set<string>();
	let current: string | null = folderId;
	while (current && !visited.has(current)) {
		if (current === ancestorId) return true;
		visited.add(current);
		current =
			collections.sidebarProjectFolders.get(current)?.parentFolderId ?? null;
	}
	return false;
}

/** Writes one level's order and moves every listed item under `parentFolderId`. */
function writeLevel(
	collections: ProjectFolderCollections,
	parentFolderId: string | null,
	items: readonly ProjectTreeItemRef[],
): void {
	const folderOrders = new Map<string, number>();
	const projectOrders = new Map<string, number>();
	items.forEach((item, index) => {
		const orders = item.type === "folder" ? folderOrders : projectOrders;
		orders.set(item.id, index + 1);
	});
	updateRows(
		collections.sidebarProjectFolders,
		folderOrders,
		(draft, tabOrder) => {
			draft.tabOrder = tabOrder;
			draft.parentFolderId = parentFolderId;
		},
	);
	updateRows(collections.sidebarProjects, projectOrders, (draft, tabOrder) => {
		draft.tabOrder = tabOrder;
		draft.folderId = parentFolderId;
	});
}

function getInsertIndex(
	siblings: readonly ProjectTreeItemRef[],
	position: ProjectTreeDropPosition,
): number {
	if (position.kind === "start") return 0;
	if (position.kind === "end") return siblings.length;
	const { anchorId } = position;
	const anchorIndex = siblings.findIndex((item) => item.id === anchorId);
	if (anchorIndex === -1) return siblings.length;
	return position.kind === "before" ? anchorIndex : anchorIndex + 1;
}

export function createProjectFolder(
	collections: ProjectFolderCollections,
	{
		parentFolderId,
		name,
		folderId = crypto.randomUUID(),
	}: { parentFolderId: string | null; name: string; folderId?: string },
): string {
	const parent = resolveParentFolderId(collections, parentFolderId);
	collections.sidebarProjectFolders.insert({
		folderId,
		parentFolderId: parent,
		name: name.trim(),
		createdAt: new Date(),
		tabOrder: getPrependTabOrder(getProjectTreeSiblings(collections, parent)),
		isCollapsed: false,
	});
	return folderId;
}

export function renameProjectFolder(
	collections: ProjectFolderCollections,
	folderId: string,
	name: string,
): void {
	const trimmed = name.trim();
	if (!trimmed || !collections.sidebarProjectFolders.get(folderId)) return;
	collections.sidebarProjectFolders.update(folderId, (draft) => {
		draft.name = trimmed;
	});
}

export function toggleProjectFolderCollapsed(
	collections: ProjectFolderCollections,
	folderId: string,
): void {
	if (!collections.sidebarProjectFolders.get(folderId)) return;
	collections.sidebarProjectFolders.update(folderId, (draft) => {
		draft.isCollapsed = !draft.isCollapsed;
	});
}

/**
 * Moves a project or folder to a position in a level. Returns false when the
 * move is not possible: an unknown item, or a folder dropped into itself or
 * one of its descendants.
 */
export function moveProjectTreeItem(
	collections: ProjectFolderCollections,
	item: ProjectTreeItemRef,
	target: ProjectTreeDropTarget,
): boolean {
	const exists =
		item.type === "folder"
			? collections.sidebarProjectFolders.get(item.id)
			: collections.sidebarProjects.get(item.id);
	if (!exists) return false;
	const parentFolderId = resolveParentFolderId(
		collections,
		target.parentFolderId,
	);
	if (
		item.type === "folder" &&
		parentFolderId !== null &&
		isFolderInside(collections, parentFolderId, item.id)
	) {
		return false;
	}
	const siblings = getProjectTreeSiblings(collections, parentFolderId).filter(
		(sibling) => !(sibling.type === item.type && sibling.id === item.id),
	);
	const next: ProjectTreeItemRef[] = [...siblings];
	next.splice(getInsertIndex(siblings, target.position), 0, item);
	writeLevel(collections, parentFolderId, next);
	return true;
}

/**
 * Deletes a folder without touching its contents: its projects and subfolders
 * take the folder's place in its parent, in their current order.
 */
export function deleteProjectFolder(
	collections: ProjectFolderCollections,
	folderId: string,
): void {
	const folder = collections.sidebarProjectFolders.get(folderId);
	if (!folder) return;
	const parentFolderId = resolveParentFolderId(
		collections,
		folder.parentFolderId,
	);
	const children = getProjectTreeSiblings(collections, folderId);
	const level = getProjectTreeSiblings(collections, parentFolderId);
	const folderIndex = level.findIndex(
		(item) => item.type === "folder" && item.id === folderId,
	);
	const next: ProjectTreeItemRef[] = level.filter(
		(item) => !(item.type === "folder" && item.id === folderId),
	);
	next.splice(
		folderIndex === -1 ? next.length : folderIndex,
		0,
		...children.map(({ type, id }) => ({ type, id })),
	);
	writeLevel(collections, parentFolderId, next);
	collections.sidebarProjectFolders.delete(folderId);
}
