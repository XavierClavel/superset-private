import { describe, expect, it } from "bun:test";
import {
	makeProject,
	makeSection,
	makeWorkspace,
} from "../testProjectFixtures";
import {
	filterDashboardSidebarByRecentActivity,
	RECENT_ACTIVITY_WINDOW_MS,
} from "./filterDashboardSidebarByRecentActivity";

const NOW = new Date("2026-09-15").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

describe("filterDashboardSidebarByRecentActivity", () => {
	it("drops idle workspaces and the projects left empty, keeping collapse state", () => {
		const api = makeProject({
			id: "p-api",
			name: "api",
			isCollapsed: true,
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({
						id: "w-expired",
						name: "expired",
						lastActivityAt: NOW - RECENT_ACTIVITY_WINDOW_MS,
					}),
				},
				{
					type: "section",
					section: makeSection({
						id: "s1",
						name: "folder",
						isCollapsed: true,
						workspaces: [
							makeWorkspace({
								id: "w-recent",
								name: "recent",
								lastActivityAt: NOW - 13 * DAY_MS,
							}),
							makeWorkspace({
								id: "w-undated",
								name: "undated",
								updatedAt: new Date("not a date"),
							}),
						],
					}),
				},
			],
		});
		const idle = makeProject({
			id: "p-idle",
			name: "idle",
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({
						id: "w-old",
						name: "old",
						lastActivityAt: NOW - 30 * DAY_MS,
					}),
				},
			],
		});

		const result = filterDashboardSidebarByRecentActivity([api, idle], NOW);

		expect(result.map((project) => project.id)).toEqual(["p-api"]);
		expect(result[0].isCollapsed).toBe(true);
		expect(result[0].children).toHaveLength(1);
		const [folder] = result[0].children;
		expect(folder.type === "section" && folder.section.isCollapsed).toBe(true);
		expect(
			folder.type === "section" &&
				folder.section.workspaces.map((workspace) => workspace.id),
		).toEqual(["w-recent"]);
	});
});
