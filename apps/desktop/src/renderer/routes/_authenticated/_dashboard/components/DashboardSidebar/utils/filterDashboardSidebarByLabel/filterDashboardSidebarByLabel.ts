import type {
	DashboardSidebarPinnedWorkspace,
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarWorkspace,
} from "../../types";

export interface DashboardSidebarLabelFilterInput {
	projects: DashboardSidebarProject[];
	sessionChildren: DashboardSidebarProjectChild[];
	sessionWorkspaces: DashboardSidebarWorkspace[];
	pinnedWorkspaces: DashboardSidebarPinnedWorkspace[];
}

type LabelIndex = ReadonlyMap<string, ReadonlySet<string>>;

function sameItems<T>(next: T[], previous: T[]): boolean {
	return (
		next.length === previous.length &&
		next.every((item, index) => item === previous[index])
	);
}

function filterChildren(
	children: DashboardSidebarProjectChild[],
	hasLabel: (workspace: DashboardSidebarWorkspace) => boolean,
): DashboardSidebarProjectChild[] {
	const filtered = children.flatMap((child): DashboardSidebarProjectChild[] => {
		if (child.type === "workspace") {
			return hasLabel(child.workspace) ? [child] : [];
		}
		const workspaces = child.section.workspaces.filter(hasLabel);
		if (workspaces.length === 0) return [];
		if (workspaces.length === child.section.workspaces.length) {
			return [
				child.section.isCollapsed
					? {
							type: "section",
							section: { ...child.section, isCollapsed: false },
						}
					: child,
			];
		}
		return [
			{
				type: "section",
				section: { ...child.section, isCollapsed: false, workspaces },
			},
		];
	});
	return sameItems(filtered, children) ? children : filtered;
}

/** Keeps the projects and folders holding a matching workspace, expanded. */
export function filterProjectsByWorkspace(
	projects: DashboardSidebarProject[],
	keep: (workspace: DashboardSidebarWorkspace) => boolean,
): DashboardSidebarProject[] {
	const filtered = projects.flatMap((project): DashboardSidebarProject[] => {
		const children = filterChildren(project.children, keep);
		if (children.length === 0) return [];
		if (children === project.children && !project.isCollapsed) {
			return [project];
		}
		return [{ ...project, isCollapsed: false, children }];
	});
	return sameItems(filtered, projects) ? projects : filtered;
}

export function filterDashboardSidebarByLabel(
	input: DashboardSidebarLabelFilterInput,
	labelId: string | null,
	labelIdsByWorkspaceId: LabelIndex,
): DashboardSidebarLabelFilterInput {
	if (labelId === null) return input;

	const hasLabel = (workspace: DashboardSidebarWorkspace): boolean =>
		labelIdsByWorkspaceId.get(workspace.id)?.has(labelId) ?? false;

	return {
		projects: filterProjectsByWorkspace(input.projects, hasLabel),
		sessionChildren: filterChildren(input.sessionChildren, hasLabel),
		sessionWorkspaces: input.sessionWorkspaces.filter(hasLabel),
		pinnedWorkspaces: input.pinnedWorkspaces.filter(hasLabel),
	};
}
