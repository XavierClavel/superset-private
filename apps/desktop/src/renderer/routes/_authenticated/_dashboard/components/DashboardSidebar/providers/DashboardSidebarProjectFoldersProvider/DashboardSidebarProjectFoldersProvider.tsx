import { useLiveQuery } from "@tanstack/react-db";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import {
	createProjectFolder,
	deleteProjectFolder,
	moveProjectTreeItem,
	type ProjectTreeDropTarget,
	type ProjectTreeItemRef,
	renameProjectFolder,
	toggleProjectFolderCollapsed,
} from "renderer/routes/_authenticated/hooks/useDashboardSidebarState/utils/projectFolderMutations";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import type {
	DashboardSidebarProjectFolder,
	DashboardSidebarProjectPlacement,
} from "../../types";

interface DashboardSidebarProjectFoldersValue {
	folders: DashboardSidebarProjectFolder[];
	placements: ReadonlyMap<string, DashboardSidebarProjectPlacement>;
	/** The folder whose name field opens on its next render. */
	pendingRenameFolderId: string | null;
	clearPendingRename: () => void;
	/** Creates a folder and opens its name field. */
	createFolder: (parentFolderId: string | null, name: string) => string;
	renameFolder: (folderId: string, name: string) => void;
	deleteFolder: (folderId: string) => void;
	toggleFolderCollapsed: (folderId: string) => void;
	moveItem: (
		item: ProjectTreeItemRef,
		target: ProjectTreeDropTarget,
	) => boolean;
}

const DashboardSidebarProjectFoldersContext =
	createContext<DashboardSidebarProjectFoldersValue | null>(null);

interface DashboardSidebarProjectFoldersProviderProps {
	children: ReactNode;
}

export function DashboardSidebarProjectFoldersProvider({
	children,
}: DashboardSidebarProjectFoldersProviderProps) {
	const collections = useCollections();
	const [pendingRenameFolderId, setPendingRenameFolderId] = useState<
		string | null
	>(null);

	const { data: folderRows = [] } = useLiveQuery(
		(q) =>
			q
				.from({ folders: collections.sidebarProjectFolders })
				.select(({ folders }) => ({
					folderId: folders.folderId,
					parentFolderId: folders.parentFolderId,
					name: folders.name,
					isCollapsed: folders.isCollapsed,
					tabOrder: folders.tabOrder,
				})),
		[collections],
	);
	const { data: placementRows = [] } = useLiveQuery(
		(q) =>
			q
				.from({ sidebarProjects: collections.sidebarProjects })
				.select(({ sidebarProjects }) => ({
					projectId: sidebarProjects.projectId,
					folderId: sidebarProjects.folderId,
					tabOrder: sidebarProjects.tabOrder,
				})),
		[collections],
	);

	const folders = useMemo<DashboardSidebarProjectFolder[]>(
		() =>
			folderRows.map((row) => ({
				id: row.folderId,
				parentFolderId: row.parentFolderId ?? null,
				name: row.name,
				isCollapsed: row.isCollapsed,
				tabOrder: row.tabOrder,
			})),
		[folderRows],
	);
	const placements = useMemo(
		() =>
			new Map<string, DashboardSidebarProjectPlacement>(
				placementRows.map((row) => [
					row.projectId,
					{ folderId: row.folderId ?? null, tabOrder: row.tabOrder },
				]),
			),
		[placementRows],
	);

	const createFolder = useCallback(
		(parentFolderId: string | null, name: string) => {
			const folderId = createProjectFolder(collections, {
				parentFolderId,
				name,
			});
			if (parentFolderId) {
				const parent = collections.sidebarProjectFolders.get(parentFolderId);
				if (parent?.isCollapsed) {
					toggleProjectFolderCollapsed(collections, parentFolderId);
				}
			}
			setPendingRenameFolderId(folderId);
			return folderId;
		},
		[collections],
	);
	const clearPendingRename = useCallback(
		() => setPendingRenameFolderId(null),
		[],
	);
	const renameFolder = useCallback(
		(folderId: string, name: string) =>
			renameProjectFolder(collections, folderId, name),
		[collections],
	);
	const deleteFolder = useCallback(
		(folderId: string) => deleteProjectFolder(collections, folderId),
		[collections],
	);
	const toggleFolderCollapsed = useCallback(
		(folderId: string) => toggleProjectFolderCollapsed(collections, folderId),
		[collections],
	);
	const moveItem = useCallback(
		(item: ProjectTreeItemRef, target: ProjectTreeDropTarget) =>
			moveProjectTreeItem(collections, item, target),
		[collections],
	);

	const value = useMemo<DashboardSidebarProjectFoldersValue>(
		() => ({
			folders,
			placements,
			pendingRenameFolderId,
			clearPendingRename,
			createFolder,
			renameFolder,
			deleteFolder,
			toggleFolderCollapsed,
			moveItem,
		}),
		[
			folders,
			placements,
			pendingRenameFolderId,
			clearPendingRename,
			createFolder,
			renameFolder,
			deleteFolder,
			toggleFolderCollapsed,
			moveItem,
		],
	);

	return (
		<DashboardSidebarProjectFoldersContext.Provider value={value}>
			{children}
		</DashboardSidebarProjectFoldersContext.Provider>
	);
}

export function useDashboardSidebarProjectFolders(): DashboardSidebarProjectFoldersValue {
	const value = useContext(DashboardSidebarProjectFoldersContext);
	if (!value) {
		throw new Error(
			"useDashboardSidebarProjectFolders must be used inside DashboardSidebarProjectFoldersProvider",
		);
	}
	return value;
}
