import { describe, expect, it } from "bun:test";
import {
	makeProject,
	makeSection,
	makeWorkspace,
} from "../testProjectFixtures";
import {
	getRecentWorkspaces,
	RECENT_WORKSPACE_WINDOW_MS,
} from "./getRecentWorkspaces";

const NOW = new Date("2026-09-15").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => NOW - days * DAY_MS;

describe("getRecentWorkspaces", () => {
	it("merges every project, folders included, newest activity first", () => {
		const api = makeProject({
			id: "p-api",
			name: "api",
			isCollapsed: true,
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({
						id: "w-old",
						name: "old",
						lastActivityAt: daysAgo(9),
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
								id: "w-new",
								name: "new",
								lastActivityAt: daysAgo(1),
							}),
						],
					}),
				},
			],
		});
		const web = makeProject({
			id: "p-web",
			name: "web",
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({
						id: "w-mid",
						name: "mid",
						lastActivityAt: daysAgo(5),
					}),
				},
			],
		});

		expect(
			getRecentWorkspaces([api, web], NOW).map(({ workspace, project }) => [
				workspace.id,
				project.id,
			]),
		).toEqual([
			["w-new", "p-api"],
			["w-mid", "p-web"],
			["w-old", "p-api"],
		]);
	});

	it("keeps only activity from the last two weeks and breaks ties by name", () => {
		const project = makeProject({
			id: "p",
			name: "p",
			children: [
				makeWorkspace({
					id: "w-undated",
					name: "a-undated",
					updatedAt: new Date("not a date"),
				}),
				makeWorkspace({
					id: "w-expired",
					name: "expired",
					lastActivityAt: NOW - RECENT_WORKSPACE_WINDOW_MS,
				}),
				makeWorkspace({
					id: "w-b",
					name: "b",
					lastActivityAt: daysAgo(13),
				}),
				makeWorkspace({
					id: "w-a",
					name: "a",
					lastActivityAt: daysAgo(13),
				}),
			].map((workspace) => ({ type: "workspace" as const, workspace })),
		});

		expect(
			getRecentWorkspaces([project], NOW).map(({ workspace }) => workspace.id),
		).toEqual(["w-a", "w-b"]);
	});
});
