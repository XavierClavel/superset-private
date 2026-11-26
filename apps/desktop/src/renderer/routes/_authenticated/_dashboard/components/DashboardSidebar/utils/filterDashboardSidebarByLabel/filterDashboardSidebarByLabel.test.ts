import { describe, expect, it } from "bun:test";
import { NO_LABEL_FILTER_KEY } from "renderer/hooks/workspace-labels/useWorkspaceLabels";
import type { DashboardSidebarPinnedWorkspace } from "../../types";
import {
	makeProject,
	makeSection,
	makeWorkspace,
} from "../testProjectFixtures";
import {
	type DashboardSidebarLabelFilterInput,
	filterDashboardSidebarByLabel,
} from "./filterDashboardSidebarByLabel";

const labels = new Map<string, ReadonlySet<string>>([
	["w1", new Set(["urgent"])],
	["w2", new Set(["urgent", "later"])],
	["w3", new Set(["later"])],
	["w4", new Set(["urgent"])],
	["s1", new Set(["urgent"])],
	["s2", new Set(["later"])],
	["active", new Set(["later"])],
]);

const input: DashboardSidebarLabelFilterInput = {
	projects: [
		makeProject({
			id: "p1",
			name: "Alpha",
			isCollapsed: true,
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({ id: "w1", name: "one" }),
				},
				{
					type: "section",
					section: makeSection({
						id: "sec1",
						name: "Folder",
						isCollapsed: true,
						workspaces: [
							makeWorkspace({ id: "w2", name: "two" }),
							makeWorkspace({ id: "w3", name: "three" }),
						],
					}),
				},
			],
		}),
		makeProject({
			id: "p2",
			name: "Beta",
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({ id: "w3", name: "three" }),
				},
			],
		}),
		makeProject({
			id: "p3",
			name: "Gamma",
			children: [
				{
					type: "workspace",
					workspace: makeWorkspace({ id: "w4", name: "four" }),
				},
			],
		}),
	],
	sessionChildren: [
		{
			type: "workspace",
			workspace: makeWorkspace({ id: "s1", name: "session-one" }),
		},
		{
			type: "section",
			section: makeSection({
				id: "sec2",
				name: "Session folder",
				workspaces: [makeWorkspace({ id: "s2", name: "session-two" })],
			}),
		},
	],
	sessionWorkspaces: [
		makeWorkspace({ id: "s1", name: "session-one" }),
		makeWorkspace({ id: "s2", name: "session-two" }),
	],
	pinnedWorkspaces: [
		{
			...makeWorkspace({ id: "w1", name: "one" }),
			projectName: "Alpha",
			projectIconUrl: null,
		},
		{
			...makeWorkspace({ id: "w3", name: "three" }),
			projectName: "Beta",
			projectIconUrl: null,
		},
	] as DashboardSidebarPinnedWorkspace[],
};

describe("filterDashboardSidebarByLabel", () => {
	it("keeps a workspace with any active label, and unlabeled ones only with the no-label key", () => {
		const withUnlabeled: DashboardSidebarLabelFilterInput = {
			...input,
			sessionWorkspaces: [
				...input.sessionWorkspaces,
				makeWorkspace({ id: "bare", name: "bare" }),
			],
		};
		const urgentOrNone = filterDashboardSidebarByLabel(
			withUnlabeled,
			new Set(["urgent", NO_LABEL_FILTER_KEY]),
			labels,
		);
		expect(urgentOrNone.sessionWorkspaces.map((w) => w.id)).toEqual([
			"s1",
			"bare",
		]);
		expect(urgentOrNone.projects.map((p) => p.id)).toEqual(["p1", "p3"]);

		const noneOnly = filterDashboardSidebarByLabel(
			withUnlabeled,
			new Set([NO_LABEL_FILTER_KEY]),
			labels,
		);
		expect(noneOnly.sessionWorkspaces.map((w) => w.id)).toEqual(["bare"]);
		expect(noneOnly.projects).toEqual([]);
	});

	it("returns the same object when no label is active", () => {
		expect(filterDashboardSidebarByLabel(input, null, labels)).toBe(input);
	});

	it("keeps only matching workspaces across several projects and drops empty projects", () => {
		const result = filterDashboardSidebarByLabel(
			input,
			new Set(["urgent"]),
			labels,
		);
		expect(result.projects.map((p) => p.id)).toEqual(["p1", "p3"]);
		expect(result.projects[0]?.isCollapsed).toBe(true);
		expect(result.projects[0]?.children).toHaveLength(2);
		expect(result.projects[1]).toBe(input.projects[2]);
	});

	it("keeps a tag folder only when one of its members matches, and keeps it collapsed", () => {
		const result = filterDashboardSidebarByLabel(
			input,
			new Set(["later"]),
			labels,
		);
		expect(result.projects.map((p) => p.id)).toEqual(["p1", "p2"]);
		const child = result.projects[0]?.children[0];
		expect(child?.type).toBe("section");
		if (child?.type !== "section") return;
		expect(child.section.isCollapsed).toBe(true);
		expect(child.section.workspaces.map((w) => w.id)).toEqual(["w2", "w3"]);

		const urgent = filterDashboardSidebarByLabel(
			input,
			new Set(["urgent"]),
			labels,
		);
		const urgentSection = urgent.projects[0]?.children[1];
		if (urgentSection?.type !== "section") throw new Error("no section");
		expect(urgentSection.section.workspaces.map((w) => w.id)).toEqual(["w2"]);

		const none = filterDashboardSidebarByLabel(
			input,
			new Set(["missing"]),
			labels,
		);
		expect(none.projects).toEqual([]);
	});

	it("filters Sessions children, the flat session list and Pinned", () => {
		const result = filterDashboardSidebarByLabel(
			input,
			new Set(["later"]),
			labels,
		);
		expect(result.sessionWorkspaces.map((w) => w.id)).toEqual(["s2"]);
		expect(result.sessionChildren).toHaveLength(1);
		expect(result.sessionChildren[0]?.type).toBe("section");
		expect(result.pinnedWorkspaces.map((w) => w.id)).toEqual(["w3"]);

		const urgent = filterDashboardSidebarByLabel(
			input,
			new Set(["urgent"]),
			labels,
		);
		expect(urgent.sessionChildren).toEqual([input.sessionChildren[0]]);
		expect(urgent.pinnedWorkspaces).toEqual([input.pinnedWorkspaces[0]]);
	});

	it("hides a non-matching active workspace like any other", () => {
		const withActive: DashboardSidebarLabelFilterInput = {
			...input,
			sessionWorkspaces: [
				...input.sessionWorkspaces,
				makeWorkspace({ id: "active", name: "active" }),
			],
		};
		const result = filterDashboardSidebarByLabel(
			withActive,
			new Set(["urgent"]),
			labels,
		);
		expect(result.sessionWorkspaces.map((w) => w.id)).toEqual(["s1"]);
	});
});
