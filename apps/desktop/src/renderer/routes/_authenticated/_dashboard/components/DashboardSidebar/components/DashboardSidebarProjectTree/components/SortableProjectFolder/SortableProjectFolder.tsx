import { useSortable } from "@dnd-kit/sortable";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { getBlockedDragProps } from "../../../../hooks/useBlockedDragNotice";
import { projectFolderDndId } from "../../../../hooks/useSidebarDnd/projectTreeDnd";
import { useDashboardSidebarProjectFolders } from "../../../../providers/DashboardSidebarProjectFoldersProvider";
import { useProjectTreeRowDropIndicator } from "../../../../stores/projectTreeDropIndicator";
import type { DashboardSidebarProjectFolder } from "../../../../types";
import { ProjectTreeDropLine } from "../ProjectTreeDropLine";
import { DashboardSidebarProjectFolderContextMenu } from "./components/DashboardSidebarProjectFolderContextMenu";
import { DashboardSidebarProjectFolderRow } from "./components/DashboardSidebarProjectFolderRow";

interface SortableProjectFolderProps {
	folder: DashboardSidebarProjectFolder;
	projectCount: number;
	/** Shown open whatever its stored state, e.g. while a filter is active. */
	isForcedOpen: boolean;
	isDragDisabled: boolean;
}

export function SortableProjectFolder({
	folder,
	projectCount,
	isForcedOpen,
	isDragDisabled,
}: SortableProjectFolderProps) {
	const { t } = useLingui();
	const {
		pendingRenameFolderId,
		clearPendingRename,
		createFolder,
		renameFolder,
		deleteFolder,
		toggleFolderCollapsed,
	} = useDashboardSidebarProjectFolders();
	const { attributes, listeners, setNodeRef, isDragging } = useSortable({
		id: projectFolderDndId(folder.id),
		disabled: isDragDisabled,
	});
	const dropIndicator = useProjectTreeRowDropIndicator(folder.id);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(folder.name);

	const startRename = () => {
		setRenameValue(folder.name);
		setIsRenaming(true);
	};
	useEffect(() => {
		if (pendingRenameFolderId !== folder.id) return;
		clearPendingRename();
		setRenameValue(folder.name);
		setIsRenaming(true);
	}, [pendingRenameFolderId, folder.id, folder.name, clearPendingRename]);

	const submitRename = () => {
		renameFolder(folder.id, renameValue);
		setIsRenaming(false);
	};

	return (
		<div
			ref={setNodeRef}
			className="relative mt-1 first:mt-0"
			style={{ opacity: isDragging ? 0.5 : undefined }}
			{...getBlockedDragProps(isDragDisabled)}
		>
			{dropIndicator === "before" && <ProjectTreeDropLine edge="before" />}
			<DashboardSidebarProjectFolderContextMenu
				folderId={folder.id}
				onRename={startRename}
				onNewSubfolder={() =>
					createFolder(folder.id, t({ message: "New folder" }))
				}
				onDelete={() => deleteFolder(folder.id)}
			>
				<DashboardSidebarProjectFolderRow
					name={folder.name}
					projectCount={projectCount}
					isCollapsed={folder.isCollapsed && !isForcedOpen}
					isDropTarget={dropIndicator === "inside"}
					isRenaming={isRenaming}
					renameValue={renameValue}
					onRenameValueChange={setRenameValue}
					onSubmitRename={submitRename}
					onCancelRename={() => setIsRenaming(false)}
					onStartRename={startRename}
					onToggleCollapse={() => toggleFolderCollapsed(folder.id)}
					{...attributes}
					{...listeners}
				/>
			</DashboardSidebarProjectFolderContextMenu>
			{dropIndicator === "after" && <ProjectTreeDropLine edge="after" />}
		</div>
	);
}
