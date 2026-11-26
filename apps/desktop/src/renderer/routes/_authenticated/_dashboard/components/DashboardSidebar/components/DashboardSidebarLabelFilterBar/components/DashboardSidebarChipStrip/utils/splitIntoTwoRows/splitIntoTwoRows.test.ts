import { describe, expect, test } from "bun:test";
import { splitIntoTwoRows } from "./splitIntoTwoRows";

describe("splitIntoTwoRows", () => {
	test("splits equal chips in half", () => {
		expect(splitIntoTwoRows([10, 10, 10, 10], 2)).toBe(2);
	});

	test("balances the rows by width, not by count", () => {
		expect(splitIntoTwoRows([60, 10, 10, 10, 10, 10], 0)).toBe(1);
	});

	test("keeps at least one chip on the first row", () => {
		expect(splitIntoTwoRows([5, 100], 0)).toBe(1);
	});
});
