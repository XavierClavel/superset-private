import { SortableContext, type SortingStrategy } from "@dnd-kit/sortable";
import { useLingui } from "@lingui/react/macro";
import { FEATURE_FLAGS } from "@superset/shared/constants";
import { OverflowFadeContainer } from "@superset/ui/overflow-fade-container";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { useFeatureFlagEnabled } from "posthog-js/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import {
	SidebarCardSlot,
	useHiringCard,
	usePaymentFailedCard,
	useReleaseNotesCard,
} from "renderer/components/SidebarCardSlot";
import { UpdatesPill } from "renderer/components/UpdatesPill";
import { useCloudWorkspaces } from "renderer/hooks/useCloudWorkspaces";
import { useMatchRoute } from "renderer/hooks/useMatchRoute";
import { useNow } from "renderer/hooks/useNow";
import { useParadevShell } from "renderer/hooks/useParadevShell";
import { useUserPreferences } from "renderer/hooks/useUserPreferences";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { ParadevAnywhereButton } from "renderer/routes/_authenticated/_dashboard/components/ParadevAnywhereButton";
import { OrganizationDropdown } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/OrganizationDropdown";
import { useIsChatSection } from "renderer/routes/_authenticated/_dashboard/hooks/useIsChatSection";
import { useDashboardSidebarState } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { useNotificationStore } from "renderer/stores/notifications";
import { useReleaseNotesCardStore } from "renderer/stores/release-notes-card";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import { DashboardSidebarAutomationsSection } from "./components/DashboardSidebarAutomationsSection";
import { DashboardSidebarBulkActions } from "./components/DashboardSidebarBulkActions";
import { DashboardSidebarBulkDeleteMount } from "./components/DashboardSidebarBulkDeleteMount";
import { DashboardSidebarChannelsSection } from "./components/DashboardSidebarChannelsSection";
import { DashboardSidebarDevsSection } from "./components/DashboardSidebarDevsSection";
import { DashboardSidebarGithubNotice } from "./components/DashboardSidebarGithubNotice";
import { DashboardSidebarHeader } from "./components/DashboardSidebarHeader";
import { DashboardSidebarHiddenProjects } from "./components/DashboardSidebarHiddenProjects";
import { DashboardSidebarHoverCardOverlay } from "./components/DashboardSidebarHoverCardOverlay";
import { DashboardSidebarLabelFilterBar } from "./components/DashboardSidebarLabelFilterBar";
import { DashboardSidebarNotificationsSection } from "./components/DashboardSidebarNotificationsSection";
import { DashboardSidebarPinnedSection } from "./components/DashboardSidebarPinnedSection";
import { DashboardSidebarProjectTree } from "./components/DashboardSidebarProjectTree";
import { ProjectTreeEndDropZone } from "./components/DashboardSidebarProjectTree/components/ProjectTreeEndDropZone";
import { SortableProjectItem } from "./components/DashboardSidebarProjectTree/components/SortableProjectItem";
import { DashboardSidebarSectionRenameProvider } from "./components/DashboardSidebarSectionRenameContext";
import { DashboardSidebarSessionsSection } from "./components/DashboardSidebarSessionsSection";
import { DashboardSidebarShellHeader } from "./components/DashboardSidebarShellHeader";
import { DashboardSidebarWorkspacesHeader } from "./components/DashboardSidebarWorkspacesHeader";
import { useGettingStartedCard } from "./components/GettingStartedCard";
import { useSetupScriptCard } from "./components/SetupScriptCard";
import { useBlockedDragNotice } from "./hooks/useBlockedDragNotice";
import { useDashboardSidebarData } from "./hooks/useDashboardSidebarData";
import { useDashboardSidebarShortcuts } from "./hooks/useDashboardSidebarShortcuts";
import { useMigrateLegacySidebarFolders } from "./hooks/useMigrateLegacySidebarFolders";
import { projectTreeRowDndId } from "./hooks/useSidebarDnd/projectTreeDnd";
import { DashboardSidebarActionsProvider } from "./providers/DashboardSidebarActionsProvider";
import { DashboardSidebarDndProvider } from "./providers/DashboardSidebarDndProvider";
import { DashboardSidebarHoverProvider } from "./providers/DashboardSidebarHoverProvider";
import {
	DashboardSidebarLabelsProvider,
	useDashboardSidebarLabels,
} from "./providers/DashboardSidebarLabelsProvider";
import {
	DashboardSidebarProjectFoldersProvider,
	useDashboardSidebarProjectFolders,
} from "./providers/DashboardSidebarProjectFoldersProvider";
import { DashboardSidebarSelectionProvider } from "./providers/DashboardSidebarSelectionProvider";
import { DashboardSidebarStaleSessionsProvider } from "./providers/DashboardSidebarStaleSessionsProvider";
import {
	DashboardSidebarWorkspaceStatusProvider,
	type SidebarStatusWorkspaceRef,
} from "./providers/DashboardSidebarWorkspaceStatusProvider";
import type { DashboardSidebarWorkspace } from "./types";
import {
	buildSidebarProjectTree,
	flattenOpenSidebarProjectTree,
	flattenSidebarProjectTree,
	listVisibleProjectTreeRows,
} from "./utils/buildSidebarProjectTree";
import { filterDashboardSidebarByLabel } from "./utils/filterDashboardSidebarByLabel";
import { filterDashboardSidebarByRecentActivity } from "./utils/filterDashboardSidebarByRecentActivity";
import { filterDashboardSidebarProjects } from "./utils/filterDashboardSidebarProjects";
import {
	filterDashboardSidebarProjectsByHost,
	matchesHostFilter,
} from "./utils/filterDashboardSidebarProjectsByHost";
import { getStaleSessionIds } from "./utils/getStaleSessionIds";
import { getProjectChildrenWorkspaces } from "./utils/projectChildren";
import { sortDashboardSidebarProjects } from "./utils/sortDashboardSidebarProjects";

const RECENT_VIEW_TICK_MS = 60 * 60 * 1000;

interface DashboardSidebarProps {
	isCollapsed?: boolean;
}

/** Rows never shift during a project or folder drag; a drop line shows the target. */
const staticSortingStrategy: SortingStrategy = () => null;

const DashboardSidebarContent = memo(function DashboardSidebarContent({
	isCollapsed = false,
}: DashboardSidebarProps) {
	const { t } = useLingui();
	const isCloudEnabled =
		useFeatureFlagEnabled(FEATURE_FLAGS.CLOUD_WORKSPACES) === true;
	const isChannelsEnabled =
		useFeatureFlagEnabled(FEATURE_FLAGS.CHANNELS) === true;
	const {
		groups,
		hiddenProjects,
		pinnedWorkspaces,
		sessionWorkspaces,
		sessionChildren,
		githubStatus,
		refreshWorkspacePullRequest,
		toggleProjectCollapsed,
	} = useDashboardSidebarData();
	const {
		deleteSection,
		renameSection,
		setProjectHidden,
		toggleSectionCollapsed,
	} = useDashboardSidebarState();
	const {
		folders: projectFolders,
		placements: projectPlacements,
		moveItem: moveProjectTreeItem,
	} = useDashboardSidebarProjectFolders();
	const showHiddenProject = useCallback(
		(projectId: string) => setProjectHidden(projectId, false),
		[setProjectHidden],
	);
	// Converts legacy uuid-keyed folders to tag-backed folders in the
	// background; retries whenever the workspace cache changes.
	useMigrateLegacySidebarFolders();
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const settingsHotkey = useHotkeyDisplay("OPEN_SETTINGS").text;
	const isSettingsOpen = !!matchRoute({ to: "/settings", fuzzy: true });
	const footerRef = useRef<HTMLDivElement>(null);
	const { activeHostUrl } = useLocalHostService();
	const workspaceRouteMatch = matchRoute({ to: "/workspace/$workspaceId" });
	const activeWorkspaceId = workspaceRouteMatch
		? workspaceRouteMatch.workspaceId
		: null;
	const isParadevShell = useParadevShell();
	const isChatSection = useIsChatSection();
	const workspacesListCollapsed = useSidebarSectionsCollapseStore(
		(s) => s.collapsed.workspaces,
	);
	const {
		preferences,
		setSidebarProjectSortMode,
		setSidebarProjectListSortMode,
		setSidebarProjectHostFilter,
		setSidebarRecentView,
	} = useUserPreferences();
	const sortMode = preferences.sidebarProjectSortMode;
	const projectListSortMode = preferences.sidebarProjectListSortMode;
	// The icon rail has no control for the filter, so it rests there.
	const hostFilter =
		isCloudEnabled && !isCollapsed
			? preferences.sidebarProjectHostFilter
			: "all";
	const isRecentView = preferences.sidebarRecentView && !isCollapsed;
	const recentViewNow = useNow(RECENT_VIEW_TICK_MS, isRecentView).getTime();
	const [projectFilterQuery, setProjectFilterQuery] = useState("");
	// The icon rail hides the Projects header (and its filter input); a
	// filter left active there would invisibly hide projects.
	useEffect(() => {
		if (isCollapsed) setProjectFilterQuery("");
	}, [isCollapsed]);

	// Local project order — syncs from groups, updated on drag end
	// Tree order: every project in the order it appears through its folders.
	const allProjectTree = useMemo(
		() =>
			buildSidebarProjectTree({
				projects: groups,
				folders: projectFolders,
				placements: projectPlacements,
				sortMode: projectListSortMode,
			}),
		[groups, projectFolders, projectPlacements, projectListSortMode],
	);
	const orderedGroups = useMemo(
		() => flattenSidebarProjectTree(allProjectTree),
		[allProjectTree],
	);
	const openFolderProjectIds = useMemo(
		() =>
			new Set(
				flattenOpenSidebarProjectTree(allProjectTree).map(
					(project) => project.id,
				),
			),
		[allProjectTree],
	);

	// Sort, then filter, as derived views: `orderedGroups` and the persisted
	// tabOrder stay untouched, so Manual restores the drag order exactly.
	const sortedGroups = useMemo(
		() =>
			sortMode === "manual"
				? orderedGroups
				: sortDashboardSidebarProjects(orderedGroups, sortMode),
		[sortMode, orderedGroups],
	);
	const { labels, labelsByWorkspaceId, activeFilterKeys, clearLabelFilter } =
		useDashboardSidebarLabels();
	const labelIdsByWorkspaceId = useMemo(
		() =>
			new Map(
				[...labelsByWorkspaceId].map(([workspaceId, workspaceLabels]) => [
					workspaceId,
					new Set(workspaceLabels.map((label) => label.id)),
				]),
			),
		[labelsByWorkspaceId],
	);
	const activeLabelKeys = isCollapsed ? null : activeFilterKeys;
	const onlyActiveFilterLabel =
		activeLabelKeys?.size === 1
			? (labels.find((label) => activeLabelKeys.has(label.id)) ?? null)
			: null;
	const labelView = useMemo(
		() =>
			filterDashboardSidebarByLabel(
				{
					projects: sortedGroups,
					sessionChildren,
					sessionWorkspaces,
					pinnedWorkspaces,
				},
				activeLabelKeys,
				labelIdsByWorkspaceId,
			),
		[
			sortedGroups,
			sessionChildren,
			sessionWorkspaces,
			pinnedWorkspaces,
			activeLabelKeys,
			labelIdsByWorkspaceId,
		],
	);
	const recentProjects = useMemo(
		() =>
			isRecentView
				? filterDashboardSidebarByRecentActivity(
						labelView.projects,
						recentViewNow,
					)
				: labelView.projects,
		[isRecentView, labelView.projects, recentViewNow],
	);
	const hostFilteredGroups = useMemo(
		() => filterDashboardSidebarProjectsByHost(recentProjects, hostFilter),
		[recentProjects, hostFilter],
	);
	const displayedPinnedWorkspaces = useMemo(
		() =>
			hostFilter === "all"
				? labelView.pinnedWorkspaces
				: labelView.pinnedWorkspaces.filter((workspace) =>
						matchesHostFilter(workspace, hostFilter),
					),
		[labelView.pinnedWorkspaces, hostFilter],
	);
	const displayedSessionWorkspaces = useMemo(
		() =>
			hostFilter === "all"
				? labelView.sessionWorkspaces
				: labelView.sessionWorkspaces.filter((workspace) =>
						matchesHostFilter(workspace, hostFilter),
					),
		[labelView.sessionWorkspaces, hostFilter],
	);
	const displayedGroups = useMemo(
		() =>
			filterDashboardSidebarProjects(hostFilteredGroups, projectFilterQuery),
		[hostFilteredGroups, projectFilterQuery],
	);
	const trimmedFilterQuery = projectFilterQuery.trim();
	const isLabelFilterActive = activeLabelKeys !== null;
	const isLabelViewEmpty =
		displayedGroups.length === 0 &&
		displayedPinnedWorkspaces.length === 0 &&
		displayedSessionWorkspaces.length === 0 &&
		labelView.sessionChildren.length === 0;
	const isRowFilterActive =
		trimmedFilterQuery !== "" || hostFilter !== "all" || isLabelFilterActive;
	const isFilterActive = isRowFilterActive || isRecentView;
	// A label filter can stay on for a long time, so it keeps the user's
	// open and collapsed state instead of forcing every match open.
	const isExpandingRowFilterActive =
		trimmedFilterQuery !== "" || hostFilter !== "all";
	const isExpandingFilterActive = isExpandingRowFilterActive || isRecentView;
	// The sort modes only reorder rows inside a project, so the project list
	// is still the manual order and stays draggable; only a filter, which
	// hides projects outright, makes a project drop unsafe to commit.
	const isProjectDragDisabled = isFilterActive;
	const displayedProjectTree = useMemo(
		() =>
			buildSidebarProjectTree({
				projects: displayedGroups,
				folders: projectFolders,
				placements: projectPlacements,
				sortMode: projectListSortMode,
				pruneEmptyFolders: isFilterActive,
			}),
		[
			displayedGroups,
			projectFolders,
			projectPlacements,
			projectListSortMode,
			isFilterActive,
		],
	);
	// The icon rail shows projects without their folders.
	const projectTreeRows = useMemo(() => {
		const rows = listVisibleProjectTreeRows(displayedProjectTree, {
			forceExpanded: isExpandingFilterActive || isCollapsed,
		});
		return isCollapsed ? rows.filter((row) => row.type === "project") : rows;
	}, [displayedProjectTree, isExpandingFilterActive, isCollapsed]);
	const projectTreeDndIds = useMemo(
		() => projectTreeRows.map(projectTreeRowDndId),
		[projectTreeRows],
	);
	const collapsedProjectFolderIds = useMemo(
		() =>
			new Set(
				isExpandingFilterActive
					? []
					: projectFolders
							.filter((folder) => folder.isCollapsed)
							.map((folder) => folder.id),
			),
		[projectFolders, isExpandingFilterActive],
	);
	const projectFoldersById = useMemo(
		() => new Map(projectFolders.map((folder) => [folder.id, folder])),
		[projectFolders],
	);
	const isChildDragDisabled = sortMode !== "manual" || isFilterActive;
	useBlockedDragNotice({
		reason: isFilterActive ? "filter" : sortMode !== "manual" ? "sort" : null,
		onSwitchToManualOrder: () => setSidebarProjectSortMode("manual"),
		onClearFilter: () => {
			setProjectFilterQuery("");
			setSidebarProjectHostFilter("all");
			clearLabelFilter();
			setSidebarRecentView(false);
		},
	});

	// Label-filtered but not text-filtered, so ⌘1–⌘9 targets stay put while typing a query.
	// A text or host filter expands matches through derived objects, so a jump
	// must not toggle the persisted collapse state while it is active.
	// Projects in a collapsed folder are off screen, so they take no ⌘1–9 slot.
	const shortcutProjects = useMemo(
		() =>
			isExpandingRowFilterActive
				? recentProjects
				: recentProjects.filter((project) =>
						openFolderProjectIds.has(project.id),
					),
		[isExpandingRowFilterActive, recentProjects, openFolderProjectIds],
	);
	const workspaceShortcutLabels = useDashboardSidebarShortcuts(
		shortcutProjects,
		labelView.sessionWorkspaces,
		labelView.sessionChildren,
		{
			revealCollapsed: !isExpandingRowFilterActive,
			pinnedWorkspaces: labelView.pinnedWorkspaces,
		},
	);
	// Scoped to what the filter actually shows — select-all and range-select
	// must not reach rows the filter is hiding.
	const selectableWorkspaceIds = useMemo(() => {
		const ids = new Set<string>();
		const addWorkspace = (workspace: DashboardSidebarWorkspace) => {
			if (
				workspace.type === "worktree" &&
				workspace.pendingTransaction?.type !== "insert"
			) {
				ids.add(workspace.id);
			}
		};
		for (const project of displayedGroups) {
			for (const child of project.children) {
				if (child.type === "workspace") {
					addWorkspace(child.workspace);
					continue;
				}
				// Members of collapsed groups are hidden and unclickable; keeping
				// them selected would leave invisible rows armed for bulk actions
				// (including Delete), so collapsing prunes them from the selection.
				if (child.section.isCollapsed) continue;
				for (const workspace of child.section.workspaces) {
					addWorkspace(workspace);
				}
			}
		}
		return ids;
	}, [displayedGroups]);

	// Every workspace the sidebar can render (pinned, sessions, project rows) —
	// the status provider fans out bindings queries and event subscriptions for
	// these once, instead of per row. Deliberately unfiltered so subscriptions
	// don't churn per keystroke.
	const { workspaces: cloudWorkspaces, isFresh: isCloudListFresh } =
		useCloudWorkspaces();
	const pruneWorkspaceSeen = useNotificationStore(
		(state) => state.pruneWorkspaceSeen,
	);
	useEffect(() => {
		if (!cloudWorkspaces || !isCloudListFresh) return;
		const live = new Set(cloudWorkspaces.map((cloud) => cloud.id));
		for (const id of Object.keys(
			useNotificationStore.getState().workspaceSeenAt,
		)) {
			if (!live.has(id)) pruneWorkspaceSeen(id);
		}
	}, [cloudWorkspaces, isCloudListFresh, pruneWorkspaceSeen]);

	const statusWorkspaces = useMemo<SidebarStatusWorkspaceRef[]>(() => {
		const byId = new Map<string, SidebarStatusWorkspaceRef>();
		for (const workspace of pinnedWorkspaces) {
			byId.set(workspace.id, { id: workspace.id, hostId: workspace.hostId });
		}
		for (const workspace of sessionWorkspaces) {
			byId.set(workspace.id, { id: workspace.id, hostId: workspace.hostId });
		}
		for (const project of orderedGroups) {
			for (const workspace of getProjectChildrenWorkspaces(project.children)) {
				byId.set(workspace.id, { id: workspace.id, hostId: workspace.hostId });
			}
		}
		for (const cloud of cloudWorkspaces ?? []) {
			byId.set(cloud.id, {
				id: cloud.id,
				hostId: cloud.id,
				reportedStatus: cloud.agentStatus ?? null,
				reportedAt: cloud.agentStatusAt?.getTime() ?? null,
			});
		}
		return [...byId.values()];
	}, [pinnedWorkspaces, sessionWorkspaces, orderedGroups, cloudWorkspaces]);

	const staleSessionIds = useMemo(
		() =>
			getStaleSessionIds([
				...sessionWorkspaces,
				...pinnedWorkspaces.filter((workspace) => workspace.projectId === null),
			]),
		[sessionWorkspaces, pinnedWorkspaces],
	);

	const activeProject = useMemo(() => {
		if (!activeWorkspaceId) return null;
		// A pinned active workspace renders outside its project group, so
		// resolve its project by id instead.
		const pinned = pinnedWorkspaces.find(
			(workspace) => workspace.id === activeWorkspaceId,
		);
		if (pinned) {
			return groups.find((project) => project.id === pinned.projectId) ?? null;
		}
		for (const project of groups) {
			for (const child of project.children) {
				if (
					child.type === "workspace" &&
					child.workspace.id === activeWorkspaceId
				) {
					return project;
				}
				if (child.type === "section") {
					for (const ws of child.section.workspaces) {
						if (ws.id === activeWorkspaceId) return project;
					}
				}
			}
		}
		return null;
	}, [groups, pinnedWorkspaces, activeWorkspaceId]);

	// Ordered by priority for the single card slot below — blocking first,
	// then actionable, then nags.
	const paymentFailedCard = usePaymentFailedCard({ surface: "v2" });
	const setupScriptCard = useSetupScriptCard({
		hostUrl: activeHostUrl,
		projectId: activeProject?.id ?? null,
		projectName: activeProject?.name ?? null,
	});
	const gettingStartedCard = useGettingStartedCard();
	const releaseNotesCard = useReleaseNotesCard();
	const isPreviewingReleaseNotes = useReleaseNotesCardStore(
		(s) => s.isPreviewing,
	);
	const hiringCard = useHiringCard({ surface: "v2" });

	const workspaceList = (
		<>
			{!isCollapsed && <DashboardSidebarLabelFilterBar />}
			<DashboardSidebarPinnedSection
				pinnedWorkspaces={displayedPinnedWorkspaces}
				isCollapsed={isCollapsed}
				onWorkspaceHover={refreshWorkspacePullRequest}
			/>
			<DashboardSidebarNotificationsSection
				pinnedWorkspaces={pinnedWorkspaces}
				sessionWorkspaces={sessionWorkspaces}
				projects={sortedGroups}
				isCollapsed={isCollapsed}
				onWorkspaceHover={refreshWorkspacePullRequest}
			/>
			<DashboardSidebarSessionsSection
				sessionWorkspaces={displayedSessionWorkspaces}
				isCollapsed={isCollapsed}
				workspaceShortcutLabels={workspaceShortcutLabels}
				onWorkspaceHover={refreshWorkspacePullRequest}
				onDeleteSection={deleteSection}
				onRenameSection={renameSection}
				onToggleSectionCollapse={toggleSectionCollapsed}
			/>
			{!isCollapsed && <DashboardSidebarAutomationsSection />}
			{!isCollapsed && (
				<div className="mt-3 first:mt-0">
					<DashboardSidebarBulkActions projects={orderedGroups}>
						<DashboardSidebarWorkspacesHeader
							sortMode={sortMode}
							onSortModeChange={setSidebarProjectSortMode}
							projectListSortMode={projectListSortMode}
							onProjectListSortModeChange={setSidebarProjectListSortMode}
							isRecentView={isRecentView}
							onRecentViewChange={setSidebarRecentView}
							hostFilter={isCloudEnabled ? hostFilter : null}
							onHostFilterChange={setSidebarProjectHostFilter}
							filterQuery={projectFilterQuery}
							onFilterQueryChange={setProjectFilterQuery}
						/>
					</DashboardSidebarBulkActions>
				</div>
			)}
			{(isCollapsed || !workspacesListCollapsed) && (
				<SortableContext
					items={projectTreeDndIds}
					strategy={staticSortingStrategy}
				>
					{isCollapsed ? (
						flattenSidebarProjectTree(displayedProjectTree).map((project) => (
							<SortableProjectItem
								key={project.id}
								project={project}
								isSidebarCollapsed
								isDragDisabled={isProjectDragDisabled}
								workspaceShortcutLabels={workspaceShortcutLabels}
								onWorkspaceHover={refreshWorkspacePullRequest}
								onToggleCollapse={toggleProjectCollapsed}
							/>
						))
					) : (
						<DashboardSidebarProjectTree
							nodes={displayedProjectTree}
							forceFoldersOpen={isExpandingFilterActive}
							isDragDisabled={isProjectDragDisabled}
							workspaceShortcutLabels={workspaceShortcutLabels}
							onWorkspaceHover={refreshWorkspacePullRequest}
							onToggleProjectCollapse={toggleProjectCollapsed}
						/>
					)}
					{!isCollapsed && <ProjectTreeEndDropZone />}
				</SortableContext>
			)}
			{!isCollapsed && !workspacesListCollapsed && (
				<DashboardSidebarHiddenProjects
					projects={hiddenProjects}
					onShow={showHiddenProject}
				/>
			)}
			{!isCollapsed &&
				isFilterActive &&
				displayedGroups.length === 0 &&
				(!isLabelFilterActive ||
					trimmedFilterQuery !== "" ||
					isLabelViewEmpty) && (
					<div className="select-text cursor-text px-4 py-2 text-xs text-muted-foreground">
						{trimmedFilterQuery !== ""
							? t({
									message: `No projects match "${trimmedFilterQuery}"`,
								})
							: onlyActiveFilterLabel
								? t({
										message: `No workspaces have the label ${onlyActiveFilterLabel.name}`,
									})
								: isLabelFilterActive
									? t({ message: "No workspaces match the label filter" })
									: isRecentView
										? t({
												message: "No agent activity in the last two weeks",
											})
										: hostFilter === "cloud"
											? t({ message: "No cloud workspaces" })
											: t({ message: "No local workspaces" })}
					</div>
				)}
		</>
	);
	const cardSlot = (
		<SidebarCardSlot
			isCollapsed={isCollapsed}
			entries={[
				isPreviewingReleaseNotes ? releaseNotesCard : null,
				paymentFailedCard,
				setupScriptCard,
				gettingStartedCard,
				releaseNotesCard,
				hiringCard,
			]}
		/>
	);

	return (
		<DashboardSidebarSelectionProvider
			availableWorkspaceIds={selectableWorkspaceIds}
			activeWorkspaceId={activeWorkspaceId}
		>
			<DashboardSidebarBulkDeleteMount />
			<DashboardSidebarSectionRenameProvider>
				<DashboardSidebarHoverProvider>
					<DashboardSidebarWorkspaceStatusProvider
						workspaces={statusWorkspaces}
						activeWorkspaceId={activeWorkspaceId}
					>
						<DashboardSidebarStaleSessionsProvider value={staleSessionIds}>
							{/* Port data comes from the single DashboardSidebarPortsProvider in the
						    dashboard layout, which wraps this sidebar. */}
							<DashboardSidebarHoverCardOverlay>
								<DashboardSidebarDndProvider
									projects={displayedGroups}
									pinnedWorkspaces={labelView.pinnedWorkspaces}
									sessionChildren={labelView.sessionChildren}
									isSidebarCollapsed={isCollapsed}
									workspaceShortcutLabels={workspaceShortcutLabels}
									projectTreeRows={projectTreeRows}
									collapsedProjectFolderIds={collapsedProjectFolderIds}
									projectListSortMode={projectListSortMode}
									projectFoldersById={projectFoldersById}
									onMoveProjectTreeItem={moveProjectTreeItem}
									isProjectDragDisabled={isProjectDragDisabled}
									isChildDragDisabled={isChildDragDisabled}
								>
									{isParadevShell ? (
										!isCollapsed && (
											<div className="flex h-full flex-col">
												{!isChatSection && <DashboardSidebarShellHeader />}
												<OverflowFadeContainer
													fadeEdges={["top", "bottom"]}
													className="flex-1 overflow-y-auto hide-scrollbar"
												>
													{isChannelsEnabled && isChatSection && (
														<>
															<DashboardSidebarChannelsSection />
															<DashboardSidebarDevsSection />
														</>
													)}
													{!isChatSection && (
														<>
															<DashboardSidebarGithubNotice
																status={githubStatus}
																isCollapsed={isCollapsed}
															/>
															{workspaceList}
														</>
													)}
												</OverflowFadeContainer>
												{cardSlot}
											</div>
										)
									) : (
										<div className="flex h-full flex-col border-r border-border bg-sidebar dark:bg-muted/35">
											<DashboardSidebarHeader isCollapsed={isCollapsed} />

											<OverflowFadeContainer
												fadeEdges={["top", "bottom"]}
												className="flex-1 overflow-y-auto hide-scrollbar"
											>
												<DashboardSidebarGithubNotice
													status={githubStatus}
													isCollapsed={isCollapsed}
												/>
												{isChannelsEnabled && !isCollapsed && (
													<>
														<DashboardSidebarChannelsSection />
														<DashboardSidebarDevsSection />
													</>
												)}
												{workspaceList}
											</OverflowFadeContainer>
											{cardSlot}
											<div
												ref={footerRef}
												className={cn(
													isCollapsed
														? "flex flex-col items-center gap-2 py-2"
														: "flex items-center gap-1 p-2",
												)}
											>
												{isCollapsed ? (
													<OrganizationDropdown variant="collapsed" />
												) : (
													<div className="min-w-0 flex-1">
														<OrganizationDropdown variant="expanded" />
													</div>
												)}

												<UpdatesPill isCollapsed={isCollapsed} />
												<ParadevAnywhereButton
													variant="footer"
													side={isCollapsed ? "right" : "top"}
													anchorRef={isCollapsed ? undefined : footerRef}
												/>
												<Tooltip delayDuration={300}>
													<TooltipTrigger asChild>
														<button
															type="button"
															aria-label={t({
																message: "Settings",
															})}
															onClick={() =>
																navigate({ to: "/settings/account" })
															}
															className={cn(
																"flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
																isSettingsOpen
																	? "bg-fill-selected text-muted-foreground"
																	: "text-muted-foreground hover:bg-fill-hover",
															)}
														>
															<HiOutlineCog6Tooth className="size-3.5" />
														</button>
													</TooltipTrigger>
													<TooltipContent side={isCollapsed ? "right" : "top"}>
														{settingsHotkey !== "Unassigned"
															? t({
																	message: `Settings (${settingsHotkey})`,
																})
															: t({
																	message: "Settings",
																})}
													</TooltipContent>
												</Tooltip>
											</div>
										</div>
									)}
								</DashboardSidebarDndProvider>
							</DashboardSidebarHoverCardOverlay>
						</DashboardSidebarStaleSessionsProvider>
					</DashboardSidebarWorkspaceStatusProvider>
				</DashboardSidebarHoverProvider>
			</DashboardSidebarSectionRenameProvider>
		</DashboardSidebarSelectionProvider>
	);
});

export const DashboardSidebar = memo(function DashboardSidebar(
	props: DashboardSidebarProps,
) {
	return (
		<DashboardSidebarActionsProvider>
			<DashboardSidebarLabelsProvider>
				<DashboardSidebarProjectFoldersProvider>
					<DashboardSidebarContent {...props} />
				</DashboardSidebarProjectFoldersProvider>
			</DashboardSidebarLabelsProvider>
		</DashboardSidebarActionsProvider>
	);
});
