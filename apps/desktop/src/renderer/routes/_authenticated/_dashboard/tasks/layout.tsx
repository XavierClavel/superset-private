import { createFileRoute, Outlet } from "@tanstack/react-router";
import { parseStatusFilter, serializeStatusFilter } from "./utils/statusFilter";

export type TasksSearch = {
	status?: string;
	assignee?: string;
	label?: string;
	search?: string;
	type?: "tasks" | "linear" | "prs" | "issues";
	project?: string;
	projects?: string;
	state?: "open" | "all";
};

export const Route = createFileRoute("/_authenticated/_dashboard/tasks")({
	component: TasksLayout,
	validateSearch: (search: Record<string, unknown>): TasksSearch => ({
		status: serializeStatusFilter(parseStatusFilter(search.status)),
		assignee:
			typeof search.assignee === "string" && !search.assignee.startsWith("ext:")
				? search.assignee
				: undefined,
		label: typeof search.label === "string" ? search.label : undefined,
		search: typeof search.search === "string" ? search.search : undefined,
		type: ["tasks", "linear", "prs", "issues"].includes(search.type as string)
			? (search.type as TasksSearch["type"])
			: undefined,
		project: typeof search.project === "string" ? search.project : undefined,
		projects: typeof search.projects === "string" ? search.projects : undefined,
		state: ["open", "all"].includes(search.state as string)
			? (search.state as TasksSearch["state"])
			: undefined,
	}),
});

function TasksLayout() {
	return <Outlet />;
}
