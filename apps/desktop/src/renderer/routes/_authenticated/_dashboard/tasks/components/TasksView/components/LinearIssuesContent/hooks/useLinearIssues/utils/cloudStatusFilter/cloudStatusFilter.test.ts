import { describe, expect, test } from "bun:test";
import { cloudStatusFilter } from "./cloudStatusFilter";

describe("cloudStatusFilter", () => {
	test("sends one status as is, and none as all", () => {
		expect(cloudStatusFilter(["completed"])).toBe("completed");
		expect(cloudStatusFilter([])).toBe("all");
	});

	test("sends several statuses as the narrowest status covering them", () => {
		expect(cloudStatusFilter(["unstarted", "started"])).toBe("active");
		expect(cloudStatusFilter(["backlog", "started"])).toBe("open");
		expect(cloudStatusFilter(["started", "completed"])).toBe("all");
	});
});
