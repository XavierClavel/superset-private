import { describe, expect, it } from "bun:test";
import { makeWorkspace } from "../testProjectFixtures";
import { getStaleSessionIds, STALE_SESSION_GAP_MS } from "./getStaleSessionIds";

const NEWEST = new Date("2026-09-15").getTime();
const HOUR_MS = 60 * 60 * 1000;

function makeSession(id: string, lastActivityAt: number | null) {
	return makeWorkspace({
		id,
		name: id,
		projectId: null,
		type: "session",
		lastActivityAt,
	});
}

describe("getStaleSessionIds", () => {
	it("marks the sessions idle a week longer than the newest one", () => {
		const newest = makeSession("newest", NEWEST);
		const recent = makeSession(
			"recent",
			NEWEST - STALE_SESSION_GAP_MS + HOUR_MS,
		);
		const stale = makeSession("stale", NEWEST - STALE_SESSION_GAP_MS - HOUR_MS);
		const undated = makeWorkspace({
			id: "undated",
			name: "undated",
			projectId: null,
			type: "session",
			updatedAt: new Date("not a date"),
		});

		expect([...getStaleSessionIds([stale, newest, undated, recent])]).toEqual([
			stale.id,
		]);
	});

	it("keeps sessions used close together fresh however long ago that was", () => {
		const lastYear = new Date("2025-09-15").getTime();
		const sessions = [
			makeSession("a", lastYear),
			makeSession("b", lastYear - STALE_SESSION_GAP_MS + HOUR_MS),
		];

		expect(getStaleSessionIds(sessions).size).toBe(0);
	});
});
