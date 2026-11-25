import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getClaudeArtifactsDir, listClaudeArtifacts } from "./claude-artifacts";

function homeWith(files: Record<string, string>): string {
	const home = mkdtempSync(path.join(tmpdir(), "claude-artifacts-"));
	const dir = getClaudeArtifactsDir(home);
	mkdirSync(dir);
	for (const [name, content] of Object.entries(files)) {
		writeFileSync(path.join(dir, name), content);
	}
	return home;
}

describe("listClaudeArtifacts", () => {
	it("is empty before any artifact was published", async () => {
		const home = mkdtempSync(path.join(tmpdir(), "claude-artifacts-"));
		expect(await listClaudeArtifacts(home)).toEqual([]);
	});

	it("lists the last published first", async () => {
		const older = "https://claude.ai/artifact/older";
		const newer = "https://claude.ai/code/artifact/newer";
		const home = homeWith({
			"older.json": JSON.stringify({ url: older, title: "Older" }),
			"newer.json": JSON.stringify({ url: newer, title: "Newer" }),
		});
		const dir = getClaudeArtifactsDir(home);
		utimesSync(path.join(dir, "older.json"), 1_000, 1_000);
		utimesSync(path.join(dir, "newer.json"), 2_000, 2_000);

		const urls = (await listClaudeArtifacts(home)).map(({ url }) => url);

		expect(urls).toEqual([newer, older]);
	});

	it("skips unreadable records and links that are not Claude artifacts", async () => {
		const url = "https://claude.ai/artifact/kept";
		const home = homeWith({
			"kept.json": JSON.stringify({ url, title: "", workspaceId: "" }),
			"broken.json": "{",
			"foreign.json": JSON.stringify({ url: "https://example.com/artifact/x" }),
			"kept.json.tmp": JSON.stringify({ url }),
		});

		expect(await listClaudeArtifacts(home)).toMatchObject([
			{ url, title: null, description: null, workspaceId: null },
		]);
	});
});
