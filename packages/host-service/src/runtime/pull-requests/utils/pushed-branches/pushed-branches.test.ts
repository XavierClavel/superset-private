import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPushedBranches } from "./pushed-branches";

const GIT_ENV = {
	...process.env,
	GIT_CONFIG_GLOBAL: "/dev/null",
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_AUTHOR_NAME: "test",
	GIT_AUTHOR_EMAIL: "test@example.com",
	GIT_COMMITTER_NAME: "test",
	GIT_COMMITTER_EMAIL: "test@example.com",
};

describe("readPushedBranches", () => {
	let root: string;
	const git = (cwd: string, ...args: string[]) =>
		execFileSync("git", args, { cwd, env: GIT_ENV, stdio: "pipe" });

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "pushed-branches-"));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	test("lists branches pushed from the repo or its worktrees, not fetched ones", async () => {
		const since = Date.now();
		git(root, "init", "-q", "--bare", "remote.git");
		git(root, "clone", "-q", "remote.git", "repo");
		git(root, "clone", "-q", "remote.git", "teammate");
		const repo = join(root, "repo");
		git(repo, "commit", "-q", "--allow-empty", "-m", "initial");
		git(repo, "push", "-q", "origin", "HEAD:main");
		const teammate = join(root, "teammate");
		git(teammate, "commit", "-q", "--allow-empty", "-m", "theirs");
		git(teammate, "push", "-q", "origin", "HEAD:their-branch");
		git(repo, "fetch", "-q", "origin");
		git(repo, "worktree", "add", "-q", "-b", "stack", join(root, "wt"));
		git(join(root, "wt"), "push", "-q", "origin", "HEAD:feature/stacked");

		expect((await readPushedBranches(repo, "origin", since)).sort()).toEqual([
			"feature/stacked",
			"main",
		]);
		expect(await readPushedBranches(repo, "origin", Date.now() + 1000)).toEqual(
			[],
		);
		expect(await readPushedBranches(teammate, "upstream", since)).toEqual([]);
	});
});
