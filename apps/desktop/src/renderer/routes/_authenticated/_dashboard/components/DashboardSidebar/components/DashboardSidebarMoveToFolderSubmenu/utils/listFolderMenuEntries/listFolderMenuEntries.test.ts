import { describe, expect, it } from "bun:test";
import type { DashboardSidebarProjectFolder } from "../../../../types";
import { listFolderMenuEntries } from "./listFolderMenuEntries";

function folder(
	id: string,
	name: string,
	parentFolderId: string | null = null,
): DashboardSidebarProjectFolder {
	return { id, name, parentFolderId, isCollapsed: true, tabOrder: 0 };
}

const folders = [
	folder("w", "Work"),
	folder("c", "Clients", "w"),
	folder("a", "Acme", "c"),
	folder("p", "Personal"),
];

describe("listFolderMenuEntries", () => {
	it("lists every folder A–Z with its depth, collapsed or not", () => {
		expect(
			listFolderMenuEntries(folders, null).map(
				(entry) => `${entry.folder.name}@${entry.depth}`,
			),
		).toEqual(["Personal@0", "Work@0", "Clients@1", "Acme@2"]);
	});

	it("leaves out the excluded folder and everything inside it", () => {
		expect(
			listFolderMenuEntries(folders, "c").map((entry) => entry.folder.id),
		).toEqual(["p", "w"]);
	});
});
