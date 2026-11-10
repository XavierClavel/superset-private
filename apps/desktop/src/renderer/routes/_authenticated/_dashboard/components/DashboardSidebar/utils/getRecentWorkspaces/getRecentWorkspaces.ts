import { getWorkspaceActivityTime } from "@superset/shared/workspace-activity";
import type {
	DashboardSidebarProject,
	DashboardSidebarWorkspace,
} from "../../types";
import { getProjectChildrenWorkspaces } from "../projectChildren";

export const RECENT_WORKSPACE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface RecentSidebarWorkspace {
	workspace: DashboardSidebarWorkspace;
	project: DashboardSidebarProject;
}

export function getRecentWorkspaces(
	projects: DashboardSidebarProject[],
	now: number,
): RecentSidebarWorkspace[] {
	return projects
		.flatMap((project) =>
			getProjectChildrenWorkspaces(project.children).map((workspace) => ({
				workspace,
				project,
				activityTime: getWorkspaceActivityTime(workspace),
			})),
		)
		.filter(
			({ activityTime }) =>
				!Number.isNaN(activityTime) &&
				now - activityTime < RECENT_WORKSPACE_WINDOW_MS,
		)
		.sort(
			(left, right) =>
				right.activityTime - left.activityTime ||
				left.workspace.name.localeCompare(right.workspace.name) ||
				left.workspace.id.localeCompare(right.workspace.id),
		)
		.map(({ workspace, project }) => ({ workspace, project }));
}
