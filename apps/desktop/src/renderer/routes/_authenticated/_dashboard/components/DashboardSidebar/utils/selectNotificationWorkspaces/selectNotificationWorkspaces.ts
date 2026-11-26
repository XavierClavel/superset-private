import { type ActivePaneStatus, STATUS_PRIORITY } from "shared/tabs-types";
import type {
	DashboardSidebarPinnedWorkspace,
	DashboardSidebarProject,
	DashboardSidebarWorkspace,
} from "../../types";
import { getProjectChildrenWorkspaces } from "../projectChildren";

const NOTIFICATION_STATUSES: ReadonlySet<ActivePaneStatus> = new Set([
	"permission",
	"failed",
	"review",
]);

export interface NotificationWorkspace {
	workspace: DashboardSidebarWorkspace;
	status: ActivePaneStatus;
	projectName: string | null;
	projectIconUrl: string | null;
}

interface SelectNotificationWorkspacesInput {
	pinnedWorkspaces: readonly DashboardSidebarPinnedWorkspace[];
	sessionWorkspaces: readonly DashboardSidebarWorkspace[];
	projects: readonly DashboardSidebarProject[];
	statuses: ReadonlyMap<string, { status: ActivePaneStatus | null }>;
}

export function selectNotificationWorkspaces({
	pinnedWorkspaces,
	sessionWorkspaces,
	projects,
	statuses,
}: SelectNotificationWorkspacesInput): NotificationWorkspace[] {
	const seen = new Set<string>();
	const selected: NotificationWorkspace[] = [];
	const add = (
		workspace: DashboardSidebarWorkspace,
		projectName: string | null,
		projectIconUrl: string | null,
	) => {
		if (seen.has(workspace.id)) return;
		seen.add(workspace.id);
		const status = statuses.get(workspace.id)?.status ?? null;
		if (!status || !NOTIFICATION_STATUSES.has(status)) return;
		selected.push({ workspace, status, projectName, projectIconUrl });
	};

	for (const workspace of pinnedWorkspaces) {
		add(workspace, workspace.projectName, workspace.projectIconUrl);
	}
	for (const workspace of sessionWorkspaces) add(workspace, null, null);
	for (const project of projects) {
		for (const workspace of getProjectChildrenWorkspaces(project.children)) {
			add(workspace, project.name, project.iconUrl);
		}
	}

	return selected
		.map((entry, index) => ({ entry, index }))
		.sort(
			(left, right) =>
				STATUS_PRIORITY[right.entry.status] -
					STATUS_PRIORITY[left.entry.status] || left.index - right.index,
		)
		.map(({ entry }) => entry);
}
