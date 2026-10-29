import { describe, expect, it } from "bun:test";
import { keepExistingLabelIds } from "./keepExistingLabelIds";

describe("keepExistingLabelIds", () => {
	it("drops ids of labels that no longer exist", () => {
		expect(
			keepExistingLabelIds(["a", "gone", "b"], [{ id: "a" }, { id: "b" }]),
		).toEqual(["a", "b"]);
	});

	it("returns nothing when every label was deleted", () => {
		expect(keepExistingLabelIds(["a"], [])).toEqual([]);
	});
});
