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
	keep: (workspace: DashboardSidebarWorkspace) => boolean,
	expand: boolean,
): DashboardSidebarProjectChild[] {
	const filtered = children.flatMap((child): DashboardSidebarProjectChild[] => {
		if (child.type === "workspace") {
			return keep(child.workspace) ? [child] : [];
		}
		const workspaces = child.section.workspaces.filter(keep);
		if (workspaces.length === 0) return [];
		const isUnchanged =
			workspaces.length === child.section.workspaces.length &&
			!(expand && child.section.isCollapsed);
		if (isUnchanged) return [child];
		return [
			{
				type: "section",
				section: {
					...child.section,
					workspaces,
					isCollapsed: expand ? false : child.section.isCollapsed,
				},
			},
		];
	});
	return sameItems(filtered, children) ? children : filtered;
}

/**
 * Keeps the projects and folders holding a matching workspace. `expand` opens
 * them, for a filter that should show every match.
 */
export function filterProjectsByWorkspace(
	projects: DashboardSidebarProject[],
	keep: (workspace: DashboardSidebarWorkspace) => boolean,
	{ expand }: { expand: boolean },
): DashboardSidebarProject[] {
	const filtered = projects.flatMap((project): DashboardSidebarProject[] => {
		const children = filterChildren(project.children, keep, expand);
		if (children.length === 0) return [];
		if (children === project.children && !(expand && project.isCollapsed)) {
			return [project];
		}
		return [
			{
				...project,
				children,
				isCollapsed: expand ? false : project.isCollapsed,
			},
		];
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
		projects: filterProjectsByWorkspace(input.projects, hasLabel, {
			expand: true,
		}),
		sessionChildren: filterChildren(input.sessionChildren, hasLabel, true),
		sessionWorkspaces: input.sessionWorkspaces.filter(hasLabel),
		pinnedWorkspaces: input.pinnedWorkspaces.filter(hasLabel),
	};
}
