import { describe, expect, it } from "bun:test";
import {
	makeProject,
	makeSection,
	makeWorkspace,
} from "../testProjectFixtures";
import { getRecentWorkspaces } from "./getRecentWorkspaces";

const at = (iso: string) => new Date(iso).getTime();

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
						lastActivityAt: at("2026-03-01"),
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
								lastActivityAt: at("2026-09-01"),
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
						lastActivityAt: at("2026-06-01"),
					}),
				},
			],
		});

		expect(
			getRecentWorkspaces([api, web]).map(({ workspace, project }) => [
				workspace.id,
				project.id,
			]),
		).toEqual([
			["w-new", "p-api"],
			["w-mid", "p-web"],
			["w-old", "p-api"],
		]);
	});

	it("puts undated workspaces last and breaks ties by name", () => {
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
					id: "w-b",
					name: "b",
					lastActivityAt: at("2026-05-01"),
				}),
				makeWorkspace({
					id: "w-a",
					name: "a",
					lastActivityAt: at("2026-05-01"),
				}),
			].map((workspace) => ({ type: "workspace" as const, workspace })),
		});

		expect(
			getRecentWorkspaces([project]).map(({ workspace }) => workspace.id),
		).toEqual(["w-a", "w-b", "w-undated"]);
	});
});
