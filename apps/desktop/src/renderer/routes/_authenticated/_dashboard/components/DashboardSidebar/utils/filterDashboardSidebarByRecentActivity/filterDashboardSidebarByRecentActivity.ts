import { getWorkspaceActivityTime } from "@superset/shared/workspace-activity";
import type { DashboardSidebarProject } from "../../types";
import { getProjectChildrenWorkspaces } from "../projectChildren";

export const RECENT_ACTIVITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function filterDashboardSidebarByRecentActivity(
	projects: DashboardSidebarProject[],
	now: number,
): DashboardSidebarProject[] {
	return projects.filter((project) =>
		getProjectChildrenWorkspaces(project.children).some((workspace) => {
			const activityTime = getWorkspaceActivityTime(workspace);
			return (
				!Number.isNaN(activityTime) &&
				now - activityTime < RECENT_ACTIVITY_WINDOW_MS
			);
		}),
	);
}
