import { describe, expect, it } from "bun:test";
import {
	createProjectFolder,
	deleteProjectFolder,
	getProjectTreeSiblings,
	moveProjectTreeItem,
	type ProjectFolderCollections,
	renameProjectFolder,
	toggleProjectFolderCollapsed,
} from "./projectFolderMutations";

function makeCollection<T>(getKey: (item: T) => string) {
	const state = new Map<string, T>();
	const updateOne = (key: string, producer: (draft: T) => void) => {
		const existing = state.get(key);
		if (!existing) return;
		const draft = structuredClone(existing);
		producer(draft);
		state.set(key, draft);
	};
	return {
		state,
		get: (key: string) => state.get(key),
		insert: (item: T) => {
			state.set(getKey(item), structuredClone(item));
		},
		update: (
			keys: string | string[],
			producer: ((draft: T) => void) | ((drafts: T[]) => void),
		) => {
			if (!Array.isArray(keys)) {
				updateOne(keys, producer as (draft: T) => void);
				return;
			}
			const drafts = keys.map((key) => structuredClone(state.get(key) as T));
			(producer as (drafts: T[]) => void)(drafts);
			keys.forEach((key, index) => {
				const draft = drafts[index];
				if (state.has(key) && draft) state.set(key, draft);
			});
		},
		delete: (keys: string | string[]) => {
			for (const key of Array.isArray(keys) ? keys : [keys]) {
				state.delete(key);
			}
		},
	};
}

interface ProjectRow {
	projectId: string;
	createdAt: Date;
	isCollapsed: boolean;
	isHidden: boolean;
	tabOrder: number;
	defaultOpenInApp: string | null;
	folderId: string | null;
}

interface FolderRow {
	folderId: string;
	parentFolderId: string | null;
	name: string;
	createdAt: Date;
	tabOrder: number;
	isCollapsed: boolean;
}

function setup() {
	const sidebarProjects = makeCollection<ProjectRow>((row) => row.projectId);
	const sidebarProjectFolders = makeCollection<FolderRow>(
		(row) => row.folderId,
	);
	const collections = {
		sidebarProjects,
		sidebarProjectFolders,
	} as unknown as ProjectFolderCollections;
	const addProject = (
		projectId: string,
		tabOrder: number,
		folderId: string | null = null,
	) =>
		sidebarProjects.insert({
			projectId,
			createdAt: new Date(0),
			isCollapsed: false,
			isHidden: false,
			tabOrder,
			defaultOpenInApp: null,
			folderId,
		});
	const addFolder = (
		folderId: string,
		tabOrder: number,
		parentFolderId: string | null = null,
	) =>
		sidebarProjectFolders.insert({
			folderId,
			parentFolderId,
			name: folderId,
			createdAt: new Date(0),
			tabOrder,
			isCollapsed: false,
		});
	const order = (parentFolderId: string | null) =>
		getProjectTreeSiblings(collections, parentFolderId).map((item) => item.id);
	return {
		collections,
		sidebarProjects,
		sidebarProjectFolders,
		addProject,
		addFolder,
		order,
	};
}

describe("createProjectFolder", () => {
	it("puts the new folder first in its parent", () => {
		const { collections, addProject, order } = setup();
		addProject("p1", 1);
		addProject("p2", 2);

		const folderId = createProjectFolder(collections, {
			parentFolderId: null,
			name: "  Work  ",
			folderId: "f1",
		});

		expect(folderId).toBe("f1");
		expect(order(null)).toEqual(["f1", "p1", "p2"]);
		expect(collections.sidebarProjectFolders.get("f1")?.name).toBe("Work");
	});

	it("nests under an existing parent and falls back to top level otherwise", () => {
		const { collections, addFolder } = setup();
		addFolder("parent", 1);

		createProjectFolder(collections, {
			parentFolderId: "parent",
			name: "Child",
			folderId: "child",
		});
		createProjectFolder(collections, {
			parentFolderId: "missing",
			name: "Orphan",
			folderId: "orphan",
		});

		expect(collections.sidebarProjectFolders.get("child")?.parentFolderId).toBe(
			"parent",
		);
		expect(
			collections.sidebarProjectFolders.get("orphan")?.parentFolderId,
		).toBeNull();
	});
});

describe("renameProjectFolder", () => {
	it("trims the name and ignores a blank one", () => {
		const { collections, addFolder } = setup();
		addFolder("f1", 1);

		renameProjectFolder(collections, "f1", "  Clients ");
		renameProjectFolder(collections, "f1", "   ");

		expect(collections.sidebarProjectFolders.get("f1")?.name).toBe("Clients");
	});
});

describe("toggleProjectFolderCollapsed", () => {
	it("flips the collapsed flag", () => {
		const { collections, addFolder } = setup();
		addFolder("f1", 1);

		toggleProjectFolderCollapsed(collections, "f1");

		expect(collections.sidebarProjectFolders.get("f1")?.isCollapsed).toBe(true);
	});
});

describe("moveProjectTreeItem", () => {
	it("reorders a project before a sibling at the same level", () => {
		const { collections, addProject, order } = setup();
		addProject("p1", 1);
		addProject("p2", 2);
		addProject("p3", 3);

		moveProjectTreeItem(
			collections,
			{ type: "project", id: "p3" },
			{ parentFolderId: null, position: { kind: "before", anchorId: "p1" } },
		);

		expect(order(null)).toEqual(["p3", "p1", "p2"]);
	});

	it("moves a project into a folder at the start", () => {
		const { collections, addProject, addFolder, order, sidebarProjects } =
			setup();
		addFolder("f1", 1);
		addProject("p1", 2);
		addProject("p2", 1, "f1");

		moveProjectTreeItem(
			collections,
			{ type: "project", id: "p1" },
			{ parentFolderId: "f1", position: { kind: "start" } },
		);

		expect(sidebarProjects.get("p1")?.folderId).toBe("f1");
		expect(order("f1")).toEqual(["p1", "p2"]);
		expect(order(null)).toEqual(["f1"]);
	});

	it("moves a project out of a folder after a top-level anchor", () => {
		const { collections, addProject, addFolder, order, sidebarProjects } =
			setup();
		addFolder("f1", 1);
		addProject("p1", 2);
		addProject("p2", 1, "f1");

		moveProjectTreeItem(
			collections,
			{ type: "project", id: "p2" },
			{ parentFolderId: null, position: { kind: "after", anchorId: "f1" } },
		);

		expect(sidebarProjects.get("p2")?.folderId).toBeNull();
		expect(order(null)).toEqual(["f1", "p2", "p1"]);
	});

	it("refuses to move a folder into itself or a descendant", () => {
		const { collections, addFolder, sidebarProjectFolders } = setup();
		addFolder("a", 1);
		addFolder("b", 1, "a");

		const intoSelf = moveProjectTreeItem(
			collections,
			{ type: "folder", id: "a" },
			{ parentFolderId: "a", position: { kind: "start" } },
		);
		const intoChild = moveProjectTreeItem(
			collections,
			{ type: "folder", id: "a" },
			{ parentFolderId: "b", position: { kind: "end" } },
		);

		expect(intoSelf).toBe(false);
		expect(intoChild).toBe(false);
		expect(sidebarProjectFolders.get("a")?.parentFolderId).toBeNull();
	});

	it("nests a folder inside another folder at the end", () => {
		const { collections, addFolder, addProject, order } = setup();
		addFolder("a", 1);
		addFolder("b", 2);
		addProject("p1", 1, "a");

		const moved = moveProjectTreeItem(
			collections,
			{ type: "folder", id: "b" },
			{ parentFolderId: "a", position: { kind: "end" } },
		);

		expect(moved).toBe(true);
		expect(order("a")).toEqual(["p1", "b"]);
		expect(order(null)).toEqual(["a"]);
	});

	it("appends when the anchor is not in the target level", () => {
		const { collections, addProject, order } = setup();
		addProject("p1", 1);
		addProject("p2", 2);

		moveProjectTreeItem(
			collections,
			{ type: "project", id: "p1" },
			{ parentFolderId: null, position: { kind: "before", anchorId: "gone" } },
		);

		expect(order(null)).toEqual(["p2", "p1"]);
	});
});

describe("deleteProjectFolder", () => {
	it("puts the folder's children in its place, in order", () => {
		const { collections, addFolder, addProject, order, sidebarProjectFolders } =
			setup();
		addProject("p1", 1);
		addFolder("f1", 2);
		addProject("p2", 3);
		addProject("inner1", 1, "f1");
		addFolder("sub", 2, "f1");
		addProject("inner2", 3, "f1");

		deleteProjectFolder(collections, "f1");

		expect(sidebarProjectFolders.get("f1")).toBeUndefined();
		expect(order(null)).toEqual(["p1", "inner1", "sub", "inner2", "p2"]);
		expect(sidebarProjectFolders.get("sub")?.parentFolderId).toBeNull();
	});

	it("moves children into the deleted folder's parent", () => {
		const { collections, addFolder, addProject, sidebarProjects } = setup();
		addFolder("outer", 1);
		addFolder("inner", 1, "outer");
		addProject("p1", 1, "inner");

		deleteProjectFolder(collections, "inner");

		expect(sidebarProjects.get("p1")?.folderId).toBe("outer");
	});
});
