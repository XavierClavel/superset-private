import { getWorkspaceActivityTime } from "@superset/shared/workspace-activity";
import type {
	DashboardSidebarProject,
	DashboardSidebarWorkspace,
} from "../../types";
import { getProjectChildrenWorkspaces } from "../projectChildren";

export interface RecentSidebarWorkspace {
	workspace: DashboardSidebarWorkspace;
	project: DashboardSidebarProject;
}

function activityRank(workspace: DashboardSidebarWorkspace): number {
	const time = getWorkspaceActivityTime(workspace);
	return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function getRecentWorkspaces(
	projects: DashboardSidebarProject[],
): RecentSidebarWorkspace[] {
	const entries = projects.flatMap((project) =>
		getProjectChildrenWorkspaces(project.children).map((workspace) => ({
			workspace,
			project,
		})),
	);
	return entries.sort(
		(left, right) =>
			activityRank(right.workspace) - activityRank(left.workspace) ||
			left.workspace.name.localeCompare(right.workspace.name) ||
			left.workspace.id.localeCompare(right.workspace.id),
	);
}
