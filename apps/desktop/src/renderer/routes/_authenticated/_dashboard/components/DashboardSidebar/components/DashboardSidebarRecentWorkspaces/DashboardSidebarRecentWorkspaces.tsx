import { Trans } from "@lingui/react/macro";
import { useMemo } from "react";
import type { DashboardSidebarProject } from "../../types";
import { getRecentWorkspaces } from "../../utils/getRecentWorkspaces";
import { DashboardSidebarWorkspaceItem } from "../DashboardSidebarWorkspaceItem";

interface DashboardSidebarRecentWorkspacesProps {
	projects: DashboardSidebarProject[];
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
}

/**
 * The Projects section as one flat list, newest activity first. Rows cannot be
 * dragged or bulk-selected: both act inside a single project.
 */
export function DashboardSidebarRecentWorkspaces({
	projects,
	workspaceShortcutLabels,
	onWorkspaceHover,
}: DashboardSidebarRecentWorkspacesProps) {
	const entries = useMemo(() => getRecentWorkspaces(projects), [projects]);

	if (entries.length === 0) {
		if (projects.length === 0) return null;
		return (
			<div className="select-text cursor-text px-4 py-2 text-xs text-muted-foreground">
				<Trans>No workspaces yet</Trans>
			</div>
		);
	}

	return (
		<div className="pb-1">
			{entries.map(({ workspace, project }) => (
				<DashboardSidebarWorkspaceItem
					key={workspace.id}
					workspace={workspace}
					indentation="top-level"
					pinnedContext={{
						projectName: project.name,
						projectIconUrl: project.iconUrl,
					}}
					shortcutLabel={workspaceShortcutLabels.get(workspace.id)}
					onHoverCardOpen={onWorkspaceHover}
				/>
			))}
		</div>
	);
}
