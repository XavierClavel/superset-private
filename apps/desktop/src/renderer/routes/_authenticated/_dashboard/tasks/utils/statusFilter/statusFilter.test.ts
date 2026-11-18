import { describe, expect, test } from "bun:test";
import {
	matchesStatusFilter,
	parseStatusFilter,
	serializeStatusFilter,
} from "./statusFilter";

describe("matchesStatusFilter", () => {
	test("keeps a status that is any of the selected ones", () => {
		expect(matchesStatusFilter("started", ["unstarted", "started"])).toBe(true);
		expect(matchesStatusFilter("completed", ["unstarted", "started"])).toBe(
			false,
		);
	});

	test("keeps every status when none is selected", () => {
		expect(matchesStatusFilter("canceled", [])).toBe(true);
	});

	test("counts Linear's triage as backlog", () => {
		expect(matchesStatusFilter("triage", ["backlog"])).toBe(true);
	});
});

describe("status filter in the URL", () => {
	test("round-trips a list and drops unknown values", () => {
		const statuses = parseStatusFilter("started,waiting,backlog,started");
		expect(statuses).toEqual(["backlog", "started"]);
		expect(parseStatusFilter(serializeStatusFilter(statuses))).toEqual(
			statuses,
		);
		expect(serializeStatusFilter([])).toBeUndefined();
	});
});
