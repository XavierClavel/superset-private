import { describe, expect, it } from "bun:test";
import {
	indexLabelsByWorkspace,
	resolveActiveFilterLabel,
	type WorkspaceLabel,
} from "./useWorkspaceLabels.utils";

const important: WorkspaceLabel = {
	id: "l1",
	name: "Important",
	color: "red",
	sortOrder: 0,
};
const later: WorkspaceLabel = {
	id: "l2",
	name: "Later",
	color: "blue",
	sortOrder: 1,
};

describe("indexLabelsByWorkspace", () => {
	it("indexes labels per workspace in label order and skips unknown label ids", () => {
		const result = indexLabelsByWorkspace(
			[important, later],
			[
				{ workspaceId: "w1", labelId: "l2" },
				{ workspaceId: "w1", labelId: "l1" },
				{ workspaceId: "w1", labelId: "gone" },
				{ workspaceId: "w2", labelId: "gone" },
			],
		);
		expect(result.get("w1")).toEqual([important, later]);
		expect(result.has("w2")).toBe(false);
	});
});

describe("resolveActiveFilterLabel", () => {
	it("returns null for null or a deleted label id", () => {
		expect(resolveActiveFilterLabel([important], "gone")).toBeNull();
		expect(resolveActiveFilterLabel([important], null)).toBeNull();
		expect(resolveActiveFilterLabel([important], important.id)).toBe(important);
	});
});
