import { getWorkspaceActivityTime } from "@superset/shared/workspace-activity";
import type { DashboardSidebarWorkspace } from "../../types";

export const STALE_SESSION_GAP_MS = 7 * 24 * 60 * 60 * 1000;

/** Measured against the newest session, not the clock, so time away from the app does not make every session stale. */
export function getStaleSessionIds(
	sessions: DashboardSidebarWorkspace[],
): Set<string> {
	const newestActivityTime = Math.max(
		...sessions
			.map(getWorkspaceActivityTime)
			.filter((time) => !Number.isNaN(time)),
	);
	return new Set(
		sessions
			.filter(
				(session) =>
					newestActivityTime - getWorkspaceActivityTime(session) >
					STALE_SESSION_GAP_MS,
			)
			.map((session) => session.id),
	);
}
