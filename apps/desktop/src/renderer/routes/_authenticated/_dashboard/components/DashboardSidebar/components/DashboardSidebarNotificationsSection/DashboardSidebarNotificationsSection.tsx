import { Trans, useLingui } from "@lingui/react/macro";
import { useFormat } from "@superset/i18n/react";
import { useMemo } from "react";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import { useSidebarWorkspaceStatuses } from "../../providers/DashboardSidebarWorkspaceStatusProvider";
import type {
	DashboardSidebarPinnedWorkspace,
	DashboardSidebarProject,
	DashboardSidebarWorkspace,
} from "../../types";
import { selectNotificationWorkspaces } from "../../utils/selectNotificationWorkspaces";
import { DashboardSidebarSectionHeader } from "../DashboardSidebarSectionHeader";
import { DashboardSidebarWorkspaceItem } from "../DashboardSidebarWorkspaceItem";

interface DashboardSidebarNotificationsSectionProps {
	pinnedWorkspaces: readonly DashboardSidebarPinnedWorkspace[];
	sessionWorkspaces: readonly DashboardSidebarWorkspace[];
	projects: readonly DashboardSidebarProject[];
	isCollapsed?: boolean;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
}

/**
 * Workspaces whose agent needs the user (permission, failed, or finished and
 * unseen), from every project, most urgent first. Opening a row clears its
 * attention, so it leaves the list.
 */
export function DashboardSidebarNotificationsSection({
	pinnedWorkspaces,
	sessionWorkspaces,
	projects,
	isCollapsed = false,
	onWorkspaceHover,
}: DashboardSidebarNotificationsSectionProps) {
	const { t } = useLingui();
	const { formatNumber } = useFormat();
	const statuses = useSidebarWorkspaceStatuses();
	const isSectionCollapsed = useSidebarSectionsCollapseStore(
		(s) => s.collapsed.notifications,
	);
	const notifications = useMemo(
		() =>
			selectNotificationWorkspaces({
				pinnedWorkspaces,
				sessionWorkspaces,
				projects,
				statuses,
			}),
		[pinnedWorkspaces, sessionWorkspaces, projects, statuses],
	);

	if (isCollapsed) {
		if (notifications.length === 0) return null;
		return (
			<div className="flex flex-col gap-0.5 py-1">
				{notifications.map(({ workspace }) => (
					<DashboardSidebarWorkspaceItem
						key={workspace.id}
						workspace={workspace}
						isCollapsed
						onHoverCardOpen={onWorkspaceHover}
					/>
				))}
				<div className="mx-3 mt-1 border-b border-border" />
			</div>
		);
	}

	return (
		<div className="mt-3 pb-1 first:mt-0">
			<DashboardSidebarSectionHeader
				label={t({ message: "Notifications" })}
				section="notifications"
			>
				{notifications.length > 0 && (
					<span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-fill-hover px-1 text-[10px] font-medium tabular-nums text-foreground">
						{formatNumber(notifications.length)}
					</span>
				)}
			</DashboardSidebarSectionHeader>
			{!isSectionCollapsed &&
				(notifications.length === 0 ? (
					<div className="select-text cursor-text px-4 py-1 text-xs text-muted-foreground">
						<Trans>Nothing needs your attention</Trans>
					</div>
				) : (
					notifications.map(({ workspace, projectName, projectIconUrl }) => (
						<DashboardSidebarWorkspaceItem
							key={workspace.id}
							workspace={workspace}
							indentation="top-level"
							pinnedContext={{ projectName, projectIconUrl }}
							onHoverCardOpen={onWorkspaceHover}
						/>
					))
				))}
		</div>
	);
}
