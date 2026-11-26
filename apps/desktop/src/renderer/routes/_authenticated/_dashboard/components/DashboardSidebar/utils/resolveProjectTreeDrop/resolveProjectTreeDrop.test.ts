import { describe, expect, it } from "bun:test";
import type { ProjectTreeRow } from "../buildSidebarProjectTree";
import {
	PROJECT_TREE_END_ID,
	resolveProjectTreeDrop,
} from "./resolveProjectTreeDrop";

const rows: ProjectTreeRow[] = [
	{ type: "folder", id: "work", parentFolderId: null, depth: 0 },
	{ type: "folder", id: "clients", parentFolderId: "work", depth: 1 },
	{ type: "project", id: "acme", parentFolderId: "clients", depth: 2 },
	{ type: "project", id: "site", parentFolderId: "work", depth: 1 },
	{ type: "folder", id: "archive", parentFolderId: null, depth: 0 },
	{ type: "project", id: "solo", parentFolderId: null, depth: 0 },
];
const collapsed = new Set(["archive"]);

function drop(
	active: { type: "folder" | "project"; id: string },
	overId: string,
	ratio: number,
	sortMode: "manual" | "name" = "manual",
) {
	return resolveProjectTreeDrop({
		rows,
		collapsedFolderIds: collapsed,
		active,
		overId,
		pointerRatio: ratio,
		sortMode,
	});
}

describe("resolveProjectTreeDrop", () => {
	it("places a project before or after another project in that project's folder", () => {
		expect(drop({ type: "project", id: "solo" }, "site", 0.2)).toEqual({
			target: {
				parentFolderId: "work",
				position: { kind: "before", anchorId: "site" },
			},
			indicator: { rowId: "site", kind: "before" },
		});
		expect(drop({ type: "project", id: "solo" }, "acme", 0.8)?.target).toEqual({
			parentFolderId: "clients",
			position: { kind: "after", anchorId: "acme" },
		});
	});

	it("drops into a folder from the middle of its header", () => {
		expect(drop({ type: "project", id: "solo" }, "work", 0.5)).toEqual({
			target: { parentFolderId: "work", position: { kind: "start" } },
			indicator: { rowId: "work", kind: "inside" },
		});
	});

	it("uses the header edges to place beside a folder", () => {
		expect(drop({ type: "project", id: "solo" }, "work", 0.1)?.target).toEqual({
			parentFolderId: null,
			position: { kind: "before", anchorId: "work" },
		});
		expect(
			drop({ type: "project", id: "solo" }, "archive", 0.9)?.target,
		).toEqual({
			parentFolderId: null,
			position: { kind: "after", anchorId: "archive" },
		});
	});

	it("drops into an expanded folder from the bottom edge, since its contents follow", () => {
		expect(drop({ type: "project", id: "solo" }, "work", 0.9)?.target).toEqual({
			parentFolderId: "work",
			position: { kind: "start" },
		});
	});

	it("refuses to drop a folder into itself or its descendants", () => {
		expect(drop({ type: "folder", id: "work" }, "clients", 0.5)).toBeNull();
		expect(drop({ type: "folder", id: "work" }, "acme", 0.2)).toBeNull();
		expect(drop({ type: "folder", id: "work" }, "work", 0.5)).toBeNull();
	});

	it("lets a folder move beside its own ancestor", () => {
		expect(
			drop({ type: "folder", id: "clients" }, "work", 0.1)?.target,
		).toEqual({
			parentFolderId: null,
			position: { kind: "before", anchorId: "work" },
		});
	});

	it("returns null for a row it does not know", () => {
		expect(drop({ type: "project", id: "solo" }, "nope", 0.5)).toBeNull();
	});

	it("only changes the folder in name order, since the order is not the user's", () => {
		expect(drop({ type: "project", id: "solo" }, "site", 0.2, "name")).toEqual({
			target: { parentFolderId: "work", position: { kind: "end" } },
			indicator: { rowId: "work", kind: "inside" },
		});
		expect(drop({ type: "project", id: "acme" }, "solo", 0.9, "name")).toEqual({
			target: { parentFolderId: null, position: { kind: "end" } },
			indicator: null,
		});
		expect(drop({ type: "project", id: "solo" }, "work", 0.1, "name")).toEqual({
			target: { parentFolderId: "work", position: { kind: "start" } },
			indicator: { rowId: "work", kind: "inside" },
		});
	});

	it("puts the item last at the top level from the end zone", () => {
		expect(
			drop({ type: "project", id: "acme" }, PROJECT_TREE_END_ID, 0.5),
		).toEqual({
			target: { parentFolderId: null, position: { kind: "end" } },
			indicator: { rowId: PROJECT_TREE_END_ID, kind: "before" },
		});
	});
});
