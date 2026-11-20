import { describe, expect, it } from "bun:test";
import { isCanaryVersion } from "./auto-update";

describe("isCanaryVersion", () => {
	it("is true only for a canary prerelease, not for a fork release or a stable version", () => {
		expect(isCanaryVersion("2.0.9-canary.20261120093000")).toBe(true);
		expect(isCanaryVersion("2.0.9-fork.12")).toBe(false);
		expect(isCanaryVersion("2.0.9")).toBe(false);
	});
});
