import { describe, expect, it } from "bun:test";
import {
	makeProject,
	makeSection,
	makeWorkspace,
} from "../testProjectFixtures";
import {
	type ActiveWorkStatus,
	filterDashboardSidebarByActiveWork,
	listActiveWorkspaceIds,
} from "./filterDashboardSidebarByActiveWork";

const idle: ActiveWorkStatus = { status: null, backgroundWork: [] };

describe("listActiveWorkspaceIds", () => {
	it("keeps working, attention and background-work workspaces, plus the open one", () => {
		const statuses = new Map<string, ActiveWorkStatus>([
			["w-working", { status: "working", backgroundWork: [] }],
			["w-permission", { status: "permission", backgroundWork: [] }],
			["w-review", { status: "review", backgroundWork: [] }],
			["w-failed", { status: "failed", backgroundWork: [] }],
			["w-shell", { status: null, backgroundWork: ["npm run dev"] }],
			["w-idle", idle],
			["w-open", idle],
		]);

		expect([...listActiveWorkspaceIds(statuses, "w-open")].sort()).toEqual([
			"w-failed",
			"w-open",
			"w-permission",
			"w-review",
			"w-shell",
			"w-working",
		]);
	});
});

describe("filterDashboardSidebarByActiveWork", () => {
	it("keeps only active workspaces, expands their project and folder, drops empty projects", () => {
		const api = makeProject({
			id: "p-api",
			name: "api",
			isCollapsed: true,
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({ id: "w-idle", name: "idle" }),
				},
				{
					type: "section",
					section: makeSection({
						id: "s1",
						name: "folder",
						isCollapsed: true,
						workspaces: [makeWorkspace({ id: "w-busy", name: "busy" })],
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
					workspace: makeWorkspace({ id: "w-old", name: "old" }),
				},
			],
		});

		const result = filterDashboardSidebarByActiveWork(
			[api, web],
			new Set(["w-busy"]),
		);

		expect(result.map((project) => project.id)).toEqual(["p-api"]);
		expect(result[0]?.isCollapsed).toBe(false);
		const child = result[0]?.children[0];
		expect(child?.type).toBe("section");
		if (child?.type !== "section") return;
		expect(child.section.isCollapsed).toBe(false);
		expect(child.section.workspaces.map((workspace) => workspace.id)).toEqual([
			"w-busy",
		]);
	});
});
