import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { resolveProjectFilterParams } from "renderer/routes/_authenticated/_dashboard/components/ProjectFilter/project-filter-utils";
import { TasksView } from "./components/TasksView";
import { Route as TasksLayoutRoute } from "./layout";
import { parseStatusFilter } from "./utils/statusFilter";

export const Route = createFileRoute("/_authenticated/_dashboard/tasks/")({
	// Legacy PR-tab URLs redirect before anything renders — a render-time
	// <Navigate> here re-navigated on every layout re-render (react #185).
	beforeLoad: ({ search }) => {
		if (search.type === "prs") {
			throw redirect({
				to: "/pull-requests",
				search: {
					search: search.search,
					projects: search.projects ?? search.project,
					state: search.state,
				},
				replace: true,
			});
		}
	},
	component: TasksPage,
});

function TasksPage() {
	const { status, assignee, label, search, type, project, projects, state } =
		TasksLayoutRoute.useSearch();
	// Stable identity: effects downstream key off this array.
	const initialProjects = useMemo(
		() => resolveProjectFilterParams(projects, project, undefined),
		[projects, project],
	);
	const initialStatuses = useMemo(
		() => (status === undefined ? undefined : parseStatusFilter(status)),
		[status],
	);
	return (
		<TasksView
			initialStatuses={initialStatuses}
			initialAssignee={assignee}
			initialLabel={label}
			initialSearch={search}
			initialType={type === "prs" ? undefined : type}
			initialProjects={initialProjects}
			initialState={state}
		/>
	);
}
