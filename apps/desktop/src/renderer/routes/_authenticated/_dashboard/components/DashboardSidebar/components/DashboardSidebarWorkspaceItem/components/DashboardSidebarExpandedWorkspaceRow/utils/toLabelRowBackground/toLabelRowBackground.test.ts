import { describe, expect, test } from "bun:test";
import { toLabelRowBackground } from "./toLabelRowBackground";

describe("toLabelRowBackground", () => {
	test("returns nothing without labels", () => {
		expect(toLabelRowBackground([])).toBeUndefined();
	});

	test("fills the row with one tint for one label", () => {
		expect(toLabelRowBackground(["#f00"])).toBe(
			"linear-gradient(color-mix(in srgb, #f00 var(--label-tint), white), color-mix(in srgb, #f00 var(--label-tint), white))",
		);
	});

	test("splits the row into equal diagonal stripes", () => {
		expect(toLabelRowBackground(["#f00", "#0f0", "#00f"])).toBe(
			"linear-gradient(115deg, color-mix(in srgb, #f00 var(--label-tint), white) 0% 33.333%, color-mix(in srgb, #0f0 var(--label-tint), white) 33.333% 66.667%, color-mix(in srgb, #00f var(--label-tint), white) 66.667% 100%)",
		);
	});
});
