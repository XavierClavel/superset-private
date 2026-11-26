import type { DashboardSidebarProjectTreeNode } from "../../types";
import { SortableProjectFolder } from "./components/SortableProjectFolder";
import { SortableProjectItem } from "./components/SortableProjectItem";

interface DashboardSidebarProjectTreeProps {
	nodes: DashboardSidebarProjectTreeNode[];
	/** Shows every folder open, e.g. while a filter narrows the list. */
	forceFoldersOpen: boolean;
	isDragDisabled: boolean;
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
	onToggleProjectCollapse: (projectId: string) => void;
}

/** Projects and their folders, nested. Folder contents are indented. */
export function DashboardSidebarProjectTree({
	nodes,
	forceFoldersOpen,
	isDragDisabled,
	workspaceShortcutLabels,
	onWorkspaceHover,
	onToggleProjectCollapse,
}: DashboardSidebarProjectTreeProps) {
	return nodes.map((node) => {
		if (node.type === "project") {
			return (
				<SortableProjectItem
					key={node.project.id}
					project={node.project}
					isSidebarCollapsed={false}
					isDragDisabled={isDragDisabled}
					workspaceShortcutLabels={workspaceShortcutLabels}
					onWorkspaceHover={onWorkspaceHover}
					onToggleCollapse={onToggleProjectCollapse}
				/>
			);
		}
		const isOpen = forceFoldersOpen || !node.folder.isCollapsed;
		return (
			<div key={node.folder.id}>
				<SortableProjectFolder
					folder={node.folder}
					projectCount={node.projectCount}
					isForcedOpen={forceFoldersOpen}
					isDragDisabled={isDragDisabled}
				/>
				{isOpen && node.children.length > 0 && (
					<div className="ml-4 border-l border-border/60 pl-1">
						<DashboardSidebarProjectTree
							nodes={node.children}
							forceFoldersOpen={forceFoldersOpen}
							isDragDisabled={isDragDisabled}
							workspaceShortcutLabels={workspaceShortcutLabels}
							onWorkspaceHover={onWorkspaceHover}
							onToggleProjectCollapse={onToggleProjectCollapse}
						/>
					</div>
				)}
			</div>
		);
	});
}
