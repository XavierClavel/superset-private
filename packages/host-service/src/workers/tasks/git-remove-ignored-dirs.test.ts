import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { simpleGit } from "simple-git";
import { gitRemoveIgnoredDirsTask } from "./git.ts";

describe("gitRemoveIgnoredDirsTask", () => {
	let repoPath: string;

	async function write(relativePath: string) {
		const path = join(repoPath, relativePath);
		mkdirSync(dirname(path), { recursive: true });
		await writeFile(path, "x");
	}

	beforeEach(async () => {
		repoPath = mkdtempSync(join(tmpdir(), "remove-ignored-dirs-"));
		const git = simpleGit(repoPath);
		await git.init();
		await writeFile(
			join(repoPath, ".gitignore"),
			["node_modules/", "build/", "cache/", ".env"].join("\n"),
		);
		await write("src/build/tracked.ts");
		await git.raw(["add", "-f", ".gitignore", "src/build/tracked.ts"]);
	});

	afterEach(() => {
		rmSync(repoPath, { recursive: true, force: true });
	});

	test("removes only ignored folders with a listed name", async () => {
		const removedDirs = ["node_modules/", "apps/web/node_modules/", "build/"];
		const keptPaths = [
			"cache/data",
			".env",
			"target/notes.txt",
			"src/build/tracked.ts",
			"src/build/generated.js",
		];
		for (const dir of removedDirs) await write(`${dir}file.js`);
		for (const path of keptPaths) await write(path);

		const { removed } = await gitRemoveIgnoredDirsTask.handler({
			worktreePath: repoPath,
			gitEnv: {},
			dirNames: ["node_modules", "build", "target"],
		});

		expect(removed.sort()).toEqual([...removedDirs].sort());
		for (const dir of removedDirs) {
			expect(existsSync(join(repoPath, dir))).toBe(false);
		}
		for (const path of keptPaths) {
			expect(existsSync(join(repoPath, path))).toBe(true);
		}
	});
});
