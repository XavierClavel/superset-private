import { useSortable } from "@dnd-kit/sortable";
import { memo, useMemo } from "react";
import { getBlockedDragProps } from "../../../../hooks/useBlockedDragNotice";
import { useDashboardSidebarDnd } from "../../../../hooks/useSidebarDnd";
import { useProjectTreeRowDropIndicator } from "../../../../stores/projectTreeDropIndicator";
import type { DashboardSidebarProject } from "../../../../types";
import { DashboardSidebarProjectSection } from "../../../DashboardSidebarProjectSection";
import { ProjectTreeDropLine } from "../ProjectTreeDropLine";

interface SortableProjectItemProps {
	project: DashboardSidebarProject;
	isSidebarCollapsed: boolean;
	isDragDisabled: boolean;
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
	onToggleCollapse: (projectId: string) => void;
}

/**
 * A project in the sidebar tree. Rows do not shift while a project or folder
 * is dragged; a drop line shows where it lands instead, because a drop can
 * also go into a folder.
 */
export const SortableProjectItem = memo(function SortableProjectItem({
	project,
	isSidebarCollapsed,
	isDragDisabled,
	workspaceShortcutLabels,
	onWorkspaceHover,
	onToggleCollapse,
}: SortableProjectItemProps) {
	const { activeType } = useDashboardSidebarDnd();
	const { attributes, listeners, setNodeRef, isDragging } = useSortable({
		id: project.id,
		disabled: isDragDisabled,
	});
	const dropIndicator = useProjectTreeRowDropIndicator(project.id);
	const isDraggingTreeItem =
		activeType === "project" || activeType === "folder";

	const section = useMemo(
		() => (
			<DashboardSidebarProjectSection
				project={project}
				isSidebarCollapsed={isSidebarCollapsed}
				isDraggingProject={isDraggingTreeItem}
				workspaceShortcutLabels={workspaceShortcutLabels}
				onWorkspaceHover={onWorkspaceHover}
				onToggleCollapse={onToggleCollapse}
				dragHandleListeners={listeners}
				dragHandleAttributes={attributes}
			/>
		),
		[
			project,
			isSidebarCollapsed,
			isDraggingTreeItem,
			workspaceShortcutLabels,
			onWorkspaceHover,
			onToggleCollapse,
			listeners,
			attributes,
		],
	);

	return (
		<div
			ref={setNodeRef}
			className="relative"
			style={{ opacity: isDragging ? 0.5 : undefined }}
			{...getBlockedDragProps(isDragDisabled)}
		>
			{dropIndicator === "before" && <ProjectTreeDropLine edge="before" />}
			{section}
			{dropIndicator === "after" && <ProjectTreeDropLine edge="after" />}
		</div>
	);
});
