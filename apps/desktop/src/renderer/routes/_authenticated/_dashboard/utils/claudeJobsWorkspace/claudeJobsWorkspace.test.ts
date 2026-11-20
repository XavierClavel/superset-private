import { describe, expect, test } from "bun:test";
import { SESSIONS_TAG_SCOPE } from "@superset/shared/workspace-tags";
import {
	CLAUDE_JOBS_WORKSPACE_TAG,
	isClaudeJobsFolder,
	isClaudeJobsWorkspace,
} from "./claudeJobsWorkspace";

describe("the Claude Jobs workspace", () => {
	test("is the session workspace with the Claude Jobs tag", () => {
		expect(
			isClaudeJobsWorkspace({
				projectId: null,
				tags: ["other", CLAUDE_JOBS_WORKSPACE_TAG],
			}),
		).toBe(true);
		expect(isClaudeJobsWorkspace({ projectId: null, tags: ["other"] })).toBe(
			false,
		);
		expect(isClaudeJobsWorkspace({ projectId: null })).toBe(false);
		expect(
			isClaudeJobsWorkspace({
				projectId: "project",
				tags: [CLAUDE_JOBS_WORKSPACE_TAG],
			}),
		).toBe(false);
	});

	test("has its folder among the sessions only", () => {
		expect(
			isClaudeJobsFolder({
				projectId: SESSIONS_TAG_SCOPE,
				tag: CLAUDE_JOBS_WORKSPACE_TAG,
			}),
		).toBe(true);
		expect(
			isClaudeJobsFolder({ projectId: SESSIONS_TAG_SCOPE, tag: "other" }),
		).toBe(false);
		expect(
			isClaudeJobsFolder({
				projectId: "project",
				tag: CLAUDE_JOBS_WORKSPACE_TAG,
			}),
		).toBe(false);
	});
});
