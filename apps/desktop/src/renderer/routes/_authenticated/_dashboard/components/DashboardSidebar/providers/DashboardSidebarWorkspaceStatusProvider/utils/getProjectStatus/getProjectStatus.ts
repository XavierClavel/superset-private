import {
	type ActivePaneStatus,
	getHighestPriorityStatus,
} from "shared/tabs-types";
import type { SidebarWorkspaceStatusEntry } from "../../DashboardSidebarWorkspaceStatusProvider";

type ProjectStatusInput = Pick<
	SidebarWorkspaceStatusEntry,
	"status" | "isUnread"
>;

/**
 * Unlike STATUS_PRIORITY, every status that asks for the user outranks
 * `working`, so an unread workspace that is also working counts as `review`.
 */
export function getProjectStatus(
	entries: Iterable<ProjectStatusInput>,
): ActivePaneStatus | null {
	const attentionStatuses: ActivePaneStatus[] = [];
	let isWorking = false;
	for (const { status, isUnread } of entries) {
		if (status === "working") isWorking = true;
		if (status && status !== "working") attentionStatuses.push(status);
		else if (isUnread) attentionStatuses.push("review");
	}
	return (
		getHighestPriorityStatus(attentionStatuses) ??
		(isWorking ? "working" : null)
	);
}
