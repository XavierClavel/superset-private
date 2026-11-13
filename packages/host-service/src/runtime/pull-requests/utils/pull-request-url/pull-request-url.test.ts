import { describe, expect, test } from "bun:test";
import { parsePullRequestUrl, uniquePullRequestRefs } from "./pull-request-url";

describe("parsePullRequestUrl", () => {
	test("reads owner, repo and number from a pull request URL", () => {
		expect(
			parsePullRequestUrl(
				"https://github.com/Pictarine/backend-picta-api/pull/3712",
			),
		).toEqual({ owner: "Pictarine", repo: "backend-picta-api", number: 3712 });
	});

	test("rejects issues, other hosts and malformed numbers", () => {
		expect(parsePullRequestUrl("https://github.com/o/r/issues/3")).toBeNull();
		expect(parsePullRequestUrl("https://gitlab.com/o/r/pull/3")).toBeNull();
		expect(parsePullRequestUrl("https://github.com/o/r/pull/0")).toBeNull();
		expect(
			parsePullRequestUrl("https://github.com/o/r/pull/3/files"),
		).toBeNull();
	});
});

describe("uniquePullRequestRefs", () => {
	test("drops duplicates that differ only in owner or repo case", () => {
		expect(
			uniquePullRequestRefs([
				"https://github.com/Owner/Repo/pull/7",
				"https://github.com/owner/repo/pull/7",
				"not a url",
				"https://github.com/owner/repo/pull/8",
			]),
		).toEqual([
			{ owner: "Owner", repo: "Repo", number: 7 },
			{ owner: "owner", repo: "repo", number: 8 },
		]);
	});
});
