import { describe, expect, it } from "bun:test";
import type { ProjectTreeRow } from "../../utils/buildSidebarProjectTree";
import {
	computeProjectTreeDrop,
	getDragPointerY,
	getProjectTreeDescendantDndIds,
	projectFolderDndId,
	toProjectTreeItem,
} from "./projectTreeDnd";

const rows: ProjectTreeRow[] = [
	{ type: "folder", id: "work", parentFolderId: null, depth: 0 },
	{ type: "folder", id: "clients", parentFolderId: "work", depth: 1 },
	{ type: "project", id: "acme", parentFolderId: "clients", depth: 2 },
	{ type: "project", id: "solo", parentFolderId: null, depth: 0 },
];
const projectIds = new Set(["acme", "solo"]);
const rect = (top: number, height: number) => ({
	top,
	height,
	bottom: top + height,
	left: 0,
	right: 100,
	width: 100,
});

describe("toProjectTreeItem", () => {
	it("reads folder and project ids and ignores everything else", () => {
		expect(toProjectTreeItem(projectFolderDndId("work"), projectIds)).toEqual({
			type: "folder",
			id: "work",
		});
		expect(toProjectTreeItem("acme", projectIds)).toEqual({
			type: "project",
			id: "acme",
		});
		expect(toProjectTreeItem("ws::acme", projectIds)).toBeNull();
	});
});

describe("getDragPointerY", () => {
	it("adds the drag delta to the pick-up point", () => {
		expect(
			getDragPointerY({
				activatorEvent: { clientY: 40 } as unknown as Event,
				delta: { x: 0, y: 25 },
				active: { rect: { current: { translated: null } } },
			}),
		).toBe(65);
	});

	it("has no pointer height for a keyboard drag", () => {
		expect(
			getDragPointerY({
				activatorEvent: { key: "Space" } as unknown as Event,
				delta: { x: 0, y: 0 },
				active: { rect: { current: { translated: rect(100, 20) } } },
			}),
		).toBeNull();
	});
});

describe("computeProjectTreeDrop", () => {
	it("converts the pointer height into a drop inside a folder", () => {
		const drop = computeProjectTreeDrop({
			rows,
			collapsedFolderIds: new Set(),
			active: { type: "project", id: "solo" },
			overId: projectFolderDndId("clients"),
			overRect: rect(100, 20),
			pointerY: 110,
			projectIds,
			sortMode: "manual",
		});
		expect(drop?.indicator).toEqual({ rowId: "clients", kind: "inside" });
	});
});

describe("getProjectTreeDescendantDndIds", () => {
	it("lists the folder and everything nested in it", () => {
		expect([...getProjectTreeDescendantDndIds(rows, "work")].sort()).toEqual(
			[
				projectFolderDndId("clients"),
				projectFolderDndId("work"),
				"acme",
			].sort(),
		);
	});
});
