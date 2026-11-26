import { describe, expect, it } from "bun:test";
import type { ActivePaneStatus } from "shared/tabs-types";
import { makeProject, makeWorkspace } from "../testProjectFixtures";
import { selectNotificationWorkspaces } from "./selectNotificationWorkspaces";

const statusMap = (entries: Record<string, ActivePaneStatus | null>) =>
	new Map(
		Object.entries(entries).map(([id, status]) => [id, { status }] as const),
	);

describe("selectNotificationWorkspaces", () => {
	it("keeps workspaces that need attention, most urgent first, across projects", () => {
		const api = makeProject({
			id: "p-api",
			name: "api",
			iconUrl: "api.png",
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({
						id: "w-done",
						name: "done",
						projectId: "p-api",
					}),
				},
				{
					type: "section",
					section: {
						id: "s1",
						name: "folder",
						projectId: "p-api",
						createdAt: new Date("2026-01-01"),
						isCollapsed: true,
						tabOrder: 0,
						color: null,
						workspaces: [
							makeWorkspace({ id: "w-ask", name: "ask", projectId: "p-api" }),
						],
					},
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
						id: "w-busy",
						name: "busy",
						projectId: "p-web",
					}),
				},
				{
					type: "workspace",
					workspace: makeWorkspace({
						id: "w-broke",
						name: "broke",
						projectId: "p-web",
					}),
				},
			],
		});
		const session = makeWorkspace({
			id: "w-session",
			name: "session",
			projectId: null,
			type: "session",
		});

		const result = selectNotificationWorkspaces({
			pinnedWorkspaces: [],
			sessionWorkspaces: [session],
			projects: [api, web],
			statuses: statusMap({
				"w-done": "review",
				"w-ask": "permission",
				"w-busy": "working",
				"w-broke": "failed",
				"w-session": "review",
			}),
		});

		expect(result.map((entry) => [entry.workspace.id, entry.status])).toEqual([
			["w-ask", "permission"],
			["w-broke", "failed"],
			["w-session", "review"],
			["w-done", "review"],
		]);
		expect(result[0]?.projectName).toBe("api");
		expect(result[0]?.projectIconUrl).toBe("api.png");
		expect(result[2]?.projectName).toBeNull();
	});

	it("lists a pinned workspace once, with its own project context", () => {
		const pinned = {
			...makeWorkspace({ id: "w-pin", name: "pin", isPinned: true }),
			projectName: "mobile",
			projectIconUrl: null,
		};

		const result = selectNotificationWorkspaces({
			pinnedWorkspaces: [pinned],
			sessionWorkspaces: [pinned],
			projects: [],
			statuses: statusMap({ "w-pin": "review" }),
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.projectName).toBe("mobile");
	});
});
