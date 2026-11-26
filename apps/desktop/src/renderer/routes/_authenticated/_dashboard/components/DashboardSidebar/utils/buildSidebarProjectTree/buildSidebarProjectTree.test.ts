import { describe, expect, it } from "bun:test";
import type {
	DashboardSidebarProjectFolder,
	DashboardSidebarProjectPlacement,
	DashboardSidebarProjectTreeNode,
} from "../../types";
import { makeProject } from "../testProjectFixtures";
import {
	buildSidebarProjectTree,
	flattenOpenSidebarProjectTree,
	flattenSidebarProjectTree,
	listVisibleProjectTreeRows,
} from "./buildSidebarProjectTree";

function folder(
	id: string,
	overrides: Partial<DashboardSidebarProjectFolder> = {},
): DashboardSidebarProjectFolder {
	return {
		id,
		parentFolderId: null,
		name: id,
		isCollapsed: false,
		tabOrder: 0,
		...overrides,
	};
}

function placements(
	entries: Array<[string, string | null, number]>,
): Map<string, DashboardSidebarProjectPlacement> {
	return new Map(
		entries.map(([projectId, folderId, tabOrder]) => [
			projectId,
			{ folderId, tabOrder },
		]),
	);
}

function shape(nodes: DashboardSidebarProjectTreeNode[]): unknown[] {
	return nodes.map((node) =>
		node.type === "project"
			? node.project.id
			: { [node.folder.id]: shape(node.children) },
	);
}

const alpha = makeProject({ id: "alpha", name: "Alpha" });
const beta = makeProject({ id: "beta", name: "beta" });
const gamma = makeProject({ id: "gamma", name: "Gamma" });
const item10 = makeProject({ id: "item10", name: "Item 10" });
const item2 = makeProject({ id: "item2", name: "Item 2" });

describe("buildSidebarProjectTree", () => {
	it("nests projects and folders in manual order", () => {
		const tree = buildSidebarProjectTree({
			projects: [alpha, beta, gamma],
			folders: [
				folder("work", { tabOrder: 2 }),
				folder("clients", { parentFolderId: "work", tabOrder: 1 }),
			],
			placements: placements([
				["alpha", null, 3],
				["beta", "work", 2],
				["gamma", "clients", 1],
			]),
			sortMode: "manual",
		});

		expect(shape(tree)).toEqual([
			{ work: [{ clients: ["gamma"] }, "beta"] },
			"alpha",
		]);
		const work = tree[0];
		expect(work?.type === "folder" && work.projectCount).toBe(2);
	});

	it("sorts by name with folders first, case-insensitive and numeric-aware", () => {
		const tree = buildSidebarProjectTree({
			projects: [gamma, item10, beta, alpha, item2],
			folders: [folder("zeta", { name: "Zeta" }), folder("a", { name: "a" })],
			placements: placements([
				["gamma", null, 1],
				["item10", null, 2],
				["beta", null, 3],
				["alpha", null, 4],
				["item2", null, 5],
			]),
			sortMode: "name",
		});

		expect(shape(tree)).toEqual([
			{ a: [] },
			{ zeta: [] },
			"alpha",
			"beta",
			"gamma",
			"item2",
			"item10",
		]);
	});

	it("puts projects and folders with a missing parent at the top level", () => {
		const tree = buildSidebarProjectTree({
			projects: [alpha],
			folders: [folder("child", { parentFolderId: "gone" })],
			placements: placements([["alpha", "gone", 1]]),
			sortMode: "manual",
		});

		expect(shape(tree)).toEqual([{ child: [] }, "alpha"]);
	});

	it("breaks a parent cycle instead of dropping the folders", () => {
		const tree = buildSidebarProjectTree({
			projects: [alpha],
			folders: [
				folder("a", { parentFolderId: "b" }),
				folder("b", { parentFolderId: "a" }),
			],
			placements: placements([["alpha", "a", 1]]),
			sortMode: "manual",
		});

		const ids = flattenSidebarProjectTree(tree).map((project) => project.id);
		expect(ids).toEqual(["alpha"]);
		expect(JSON.stringify(shape(tree))).toContain('"a"');
		expect(JSON.stringify(shape(tree))).toContain('"b"');
	});

	it("drops folders without projects when asked to", () => {
		const tree = buildSidebarProjectTree({
			projects: [alpha],
			folders: [
				folder("full"),
				folder("empty"),
				folder("emptyChild", { parentFolderId: "full" }),
			],
			placements: placements([["alpha", "full", 1]]),
			sortMode: "manual",
			pruneEmptyFolders: true,
		});

		expect(shape(tree)).toEqual([{ full: ["alpha"] }]);
	});
});

describe("flattenSidebarProjectTree", () => {
	it("lists projects in tree order, inside collapsed folders too", () => {
		const tree = buildSidebarProjectTree({
			projects: [alpha, beta],
			folders: [folder("f", { isCollapsed: true, tabOrder: 1 })],
			placements: placements([
				["alpha", null, 2],
				["beta", "f", 1],
			]),
			sortMode: "manual",
		});

		expect(flattenSidebarProjectTree(tree).map((p) => p.id)).toEqual([
			"beta",
			"alpha",
		]);
	});
});

describe("flattenOpenSidebarProjectTree", () => {
	it("leaves out projects inside a collapsed folder at any depth", () => {
		const tree = buildSidebarProjectTree({
			projects: [alpha, beta, gamma],
			folders: [
				folder("open", { tabOrder: 1 }),
				folder("shut", { parentFolderId: "open", isCollapsed: true }),
			],
			placements: placements([
				["alpha", "open", 2],
				["beta", "shut", 1],
				["gamma", null, 2],
			]),
			sortMode: "manual",
		});

		expect(flattenOpenSidebarProjectTree(tree).map((p) => p.id)).toEqual([
			"alpha",
			"gamma",
		]);
	});
});

describe("listVisibleProjectTreeRows", () => {
	const tree = buildSidebarProjectTree({
		projects: [alpha, beta],
		folders: [folder("f", { isCollapsed: true, tabOrder: 1 })],
		placements: placements([
			["alpha", null, 2],
			["beta", "f", 1],
		]),
		sortMode: "manual",
	});

	it("skips the contents of collapsed folders", () => {
		expect(listVisibleProjectTreeRows(tree)).toEqual([
			{ type: "folder", id: "f", parentFolderId: null, depth: 0 },
			{ type: "project", id: "alpha", parentFolderId: null, depth: 0 },
		]);
	});

	it("shows every row when folders are forced open", () => {
		expect(
			listVisibleProjectTreeRows(tree, { forceExpanded: true }).map(
				(row) => `${row.id}@${row.depth}`,
			),
		).toEqual(["f@0", "beta@1", "alpha@0"]);
	});
});
