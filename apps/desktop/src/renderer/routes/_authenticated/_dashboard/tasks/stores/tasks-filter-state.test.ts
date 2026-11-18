import { describe, expect, test } from "bun:test";
import {
	migrateTasksFilterState,
	tasksSearchFromFilters,
	useTasksFilterStore,
} from "./tasks-filter-state";

describe("useTasksFilterStore.setProjectFilters", () => {
	test("does not notify subscribers when filters are unchanged", () => {
		// Views sync filters back through an effect keyed on this array, so an
		// always-fresh reference here regresses into an infinite update loop.
		const { setProjectFilters } = useTasksFilterStore.getState();
		setProjectFilters(["project-1", "project-2"]);
		const before = useTasksFilterStore.getState().projectFilters;
		let notifications = 0;
		const unsubscribe = useTasksFilterStore.subscribe(() => {
			notifications += 1;
		});
		setProjectFilters(["project-1", "project-2"]);
		unsubscribe();
		expect(useTasksFilterStore.getState().projectFilters).toBe(before);
		expect(notifications).toBe(0);
		useTasksFilterStore.getState().setProjectFilters([]);
	});
});

describe("tasksSearchFromFilters", () => {
	test("keeps default task filters out of the URL", () => {
		expect(
			tasksSearchFromFilters({
				statuses: [],
				assignee: null,
				label: null,
				search: "",
				typeTab: "tasks",
				projectFilters: [],
				includeClosedIssues: false,
			}),
		).toEqual({});
	});

	test("preserves GitHub Issue context across detail navigation", () => {
		expect(
			tasksSearchFromFilters({
				statuses: ["unstarted", "started"],
				assignee: "me",
				label: "acme/web",
				search: "remote host",
				typeTab: "issues",
				projectFilters: ["project-1", "project-2"],
				includeClosedIssues: true,
			}),
		).toEqual({
			status: "unstarted,started",
			assignee: "me",
			label: "acme/web",
			search: "remote host",
			type: "issues",
			projects: "project-1,project-2",
			state: "all",
		});
	});

	test("does not leak the issue state filter into Linear tasks", () => {
		expect(
			tasksSearchFromFilters({
				statuses: [],
				assignee: null,
				label: null,
				search: "",
				typeTab: "tasks",
				projectFilters: ["project-1"],
				includeClosedIssues: true,
			}),
		).toEqual({
			projects: "project-1",
		});
	});
});

describe("migrateTasksFilterState", () => {
	test("moves legacy PR tabs back to Tasks and defaults issue state safely", () => {
		expect(
			migrateTasksFilterState({
				typeTab: "prs",
				projectFilter: "project-1",
			}),
		).toMatchObject({
			typeTab: "tasks",
			projectFilters: ["project-1"],
			includeClosedIssues: false,
		});
	});

	test("survives corrupt persisted values", () => {
		expect(
			migrateTasksFilterState({
				tab: "waiting",
				viewMode: "grid",
				projectFilters: ["project-1", false, "project-1"],
			}),
		).toMatchObject({
			statuses: [],
			typeTab: "tasks",
			viewMode: "table",
			includeClosedIssues: false,
			projectFilters: ["project-1"],
		});
		expect(migrateTasksFilterState(null)).toMatchObject({
			statuses: [],
			typeTab: "tasks",
			viewMode: "table",
			includeClosedIssues: false,
			projectFilters: [],
		});
	});

	test("turns a saved single status into a status list", () => {
		expect(migrateTasksFilterState({ tab: "active" }).statuses).toEqual([
			"unstarted",
			"started",
		]);
		expect(migrateTasksFilterState({ tab: "completed" }).statuses).toEqual([
			"completed",
		]);
		expect(migrateTasksFilterState({ tab: "all" }).statuses).toEqual([]);
		expect(
			migrateTasksFilterState({ statuses: ["started", "waiting", "backlog"] })
				.statuses,
		).toEqual(["backlog", "started"]);
	});

	test("keeps the Linear tab and its filters", () => {
		expect(
			migrateTasksFilterState({
				typeTab: "linear",
				linearTeamFilter: "team-1",
				linearAssigneeFilter: "me",
			}),
		).toMatchObject({
			typeTab: "linear",
			linearTeamFilter: "team-1",
			linearAssigneeFilter: "me",
		});
		expect(migrateTasksFilterState({ linearTeamFilter: 7 })).toMatchObject({
			linearTeamFilter: null,
			linearAssigneeFilter: null,
		});
	});
});
