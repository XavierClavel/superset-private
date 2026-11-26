import { describe, expect, it } from "bun:test";
import {
	indexLabelsByWorkspace,
	NO_LABEL_FILTER_KEY,
	resolveActiveFilterKeys,
	selectOnlyFilterKey,
	toggleFilterKey,
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

describe("resolveActiveFilterKeys", () => {
	it("drops deleted labels and falls back to no filter when none is left", () => {
		expect(resolveActiveFilterKeys([important], null)).toBeNull();
		expect(resolveActiveFilterKeys([important], ["gone"])).toBeNull();
		expect(resolveActiveFilterKeys([important], [])).toBeNull();
		expect([
			...(resolveActiveFilterKeys(
				[important],
				["gone", important.id, NO_LABEL_FILTER_KEY],
			) ?? []),
		]).toEqual([important.id, NO_LABEL_FILTER_KEY]);
	});
});

describe("selectOnlyFilterKey", () => {
	it("keeps only the clicked key, and clears the filter on a second click", () => {
		expect(selectOnlyFilterKey(null, "l1")).toEqual(["l1"]);
		expect(selectOnlyFilterKey(new Set(["l1", "l2"]), "l1")).toEqual(["l1"]);
		expect(selectOnlyFilterKey(new Set(["l1"]), "l1")).toBeNull();
	});
});

describe("toggleFilterKey", () => {
	const labels = [important, later];

	it("turns off one key from no filter and keeps the others on", () => {
		expect(toggleFilterKey(labels, null, later.id)).toEqual([
			important.id,
			NO_LABEL_FILTER_KEY,
		]);
	});

	it("turns a key back on, and clears the filter once every key is on", () => {
		expect(toggleFilterKey(labels, new Set([important.id]), later.id)).toEqual([
			important.id,
			later.id,
		]);
		expect(
			toggleFilterKey(
				labels,
				new Set([important.id, NO_LABEL_FILTER_KEY]),
				later.id,
			),
		).toBeNull();
	});

	it("clears the filter when the last key is turned off", () => {
		expect(
			toggleFilterKey(labels, new Set([important.id]), important.id),
		).toBeNull();
	});
});
