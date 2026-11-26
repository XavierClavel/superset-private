import type { ActivePaneStatus } from "shared/tabs-types";
import type { DashboardSidebarProject } from "../../types";
import { filterProjectsByWorkspace } from "../filterDashboardSidebarByLabel";

export interface ActiveWorkStatus {
	status: ActivePaneStatus | null;
	backgroundWork: readonly string[];
}

/**
 * A workspace is active while an agent works in it or asks for the user, or
 * while background work still runs there. The open workspace also counts:
 * opening it clears its "review" status, and it must not leave the list then.
 */
export function listActiveWorkspaceIds(
	statuses: ReadonlyMap<string, ActiveWorkStatus>,
	openWorkspaceId: string | null,
): Set<string> {
	const ids = new Set<string>();
	for (const [workspaceId, entry] of statuses) {
		if (entry.status !== null || entry.backgroundWork.length > 0) {
			ids.add(workspaceId);
		}
	}
	if (openWorkspaceId) ids.add(openWorkspaceId);
	return ids;
}

export function filterDashboardSidebarByActiveWork(
	projects: DashboardSidebarProject[],
	activeWorkspaceIds: ReadonlySet<string>,
): DashboardSidebarProject[] {
	return filterProjectsByWorkspace(
		projects,
		(workspace) => activeWorkspaceIds.has(workspace.id),
		{ expand: true },
	);
}
