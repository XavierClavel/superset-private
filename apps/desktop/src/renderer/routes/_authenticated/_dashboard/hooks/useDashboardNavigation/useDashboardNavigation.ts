import { useNavigate } from "@tanstack/react-router";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useMatchRoute } from "renderer/hooks/useMatchRoute";
import { useIsChatSection } from "renderer/routes/_authenticated/_dashboard/hooks/useIsChatSection";
import {
	pullRequestsSearchFromFilters,
	usePullRequestsFilterStore,
} from "renderer/routes/_authenticated/_dashboard/pull-requests/stores/pullRequestsFilterStore";
import {
	organizationChatTabs,
	useChatTabsStore,
} from "renderer/routes/_authenticated/_dashboard/stores/chatTabsStore";
import {
	tasksSearchFromFilters,
	useTasksFilterStore,
} from "renderer/routes/_authenticated/_dashboard/tasks/stores/tasks-filter-state";
import {
	getUsageLastSection,
	usageSectionPath,
} from "renderer/routes/_authenticated/settings/usage/utils/usageLastSection";

/** The rail's destinations. Each list screen reopens with the filters it last showed. */
export function useDashboardNavigation() {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const organizationId = useActiveOrganizationId();
	const isChatSection = useIsChatSection();

	return {
		isHomeOpen: !!matchRoute({ to: "/new-workspace" }),
		openHome: () => navigate({ to: "/new-workspace" }),

		isChannelsOpen: isChatSection,
		openChannels: () => {
			const { tabs: allTabs, activeTabId } = useChatTabsStore.getState();
			const tabs = organizationChatTabs(allTabs, organizationId);
			const active = tabs.find((tab) => tab.id === activeTabId) ?? tabs.at(-1);
			return active
				? navigate({ href: active.href })
				: navigate({ to: "/channels/threads" });
		},

		isWorkspacesOpen: !!matchRoute({ to: "/workspaces" }),
		openWorkspaces: () => navigate({ to: "/workspaces" }),

		isAutomationsOpen: !!matchRoute({ to: "/automations", fuzzy: true }),
		openAutomations: () => navigate({ to: "/automations" }),
		openFailedAutomations: () =>
			navigate({
				to: "/automations/runs",
				search: { status: "failed", scope: "mine" },
			}),

		isTasksOpen: !!matchRoute({ to: "/tasks", fuzzy: true }),
		openTasks: () => {
			const tasksFilters = useTasksFilterStore.getState();
			return navigate({
				to: "/tasks",
				search: tasksSearchFromFilters({
					statuses: tasksFilters.statuses,
					assignee: tasksFilters.assignee,
					label: tasksFilters.label,
					search: tasksFilters.search,
					typeTab: tasksFilters.typeTab,
					projectFilters: tasksFilters.projectFilters,
					includeClosedIssues: tasksFilters.includeClosedIssues,
				}),
			});
		},

		isPullRequestsOpen: !!matchRoute({ to: "/pull-requests", fuzzy: true }),
		openPullRequests: () => {
			const pullRequestsFilters = usePullRequestsFilterStore.getState();
			return navigate({
				to: "/pull-requests",
				search: pullRequestsSearchFromFilters({
					search: pullRequestsFilters.search,
					projectFilters: pullRequestsFilters.projectFilters,
					authorFilter: pullRequestsFilters.authorFilter,
					reviewerFilter: pullRequestsFilters.reviewerFilter,
					reviewFilter: pullRequestsFilters.reviewFilter,
					includeClosed: pullRequestsFilters.includeClosed,
					mergedOnly: pullRequestsFilters.mergedOnly,
				}),
			});
		},

		isPagesOpen: !!matchRoute({ to: "/pages", fuzzy: true }),
		openPages: () => navigate({ to: "/pages" }),

		isPluginsOpen: !!matchRoute({ to: "/plugins", fuzzy: true }),
		openPlugins: () => navigate({ to: "/plugins" }),

		// Reopens whichever Usage section (token / machine resources) was
		// visited last.
		openUsage: () => navigate({ to: usageSectionPath(getUsageLastSection()) }),
	};
}
