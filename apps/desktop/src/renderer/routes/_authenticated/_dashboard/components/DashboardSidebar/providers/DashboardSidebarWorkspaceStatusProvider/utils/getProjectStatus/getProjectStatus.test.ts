import { describe, expect, it } from "bun:test";
import { getProjectStatus } from "./getProjectStatus";

describe("getProjectStatus", () => {
	it("is null when no workspace has a status", () => {
		expect(getProjectStatus([])).toBeNull();
		expect(getProjectStatus([{ status: null, isUnread: false }])).toBeNull();
	});

	it("is working when a workspace works and nothing asks for the user", () => {
		expect(
			getProjectStatus([
				{ status: null, isUnread: false },
				{ status: "working", isUnread: false },
			]),
		).toBe("working");
	});

	it("puts a status that asks for the user above working", () => {
		expect(getProjectStatus([{ status: "working", isUnread: true }])).toBe(
			"review",
		);
		expect(
			getProjectStatus([
				{ status: "working", isUnread: false },
				{ status: "review", isUnread: true },
			]),
		).toBe("review");
	});

	it("picks the highest-priority attention status across workspaces", () => {
		expect(
			getProjectStatus([
				{ status: "review", isUnread: true },
				{ status: "permission", isUnread: false },
				{ status: "failed", isUnread: true },
			]),
		).toBe("permission");
	});
});
