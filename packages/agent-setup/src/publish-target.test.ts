import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	getPublishTargetPath,
	readPublishTarget,
	writePublishTarget,
} from "./publish-target";

function freshHome(): string {
	return mkdtempSync(path.join(tmpdir(), "publish-target-"));
}

describe("publish target", () => {
	it("defaults to Paradev Pages when nothing is saved", () => {
		expect(readPublishTarget(freshHome())).toBe("page");
	});

	it("reads back what was written", () => {
		const home = freshHome();
		writePublishTarget("artifact", home);
		expect(readPublishTarget(home)).toBe("artifact");
		writePublishTarget("page", home);
		expect(readPublishTarget(home)).toBe("page");
	});

	it("falls back to the default on an unknown value", () => {
		const home = freshHome();
		writeFileSync(getPublishTargetPath(home), "something-else\n");
		expect(readPublishTarget(home)).toBe("page");
	});
});
