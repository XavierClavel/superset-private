import { SESSIONS_TAG_SCOPE } from "@superset/shared/workspace-tags";

/** Marks the one session workspace where Claude Jobs runs open as chats. */
export const CLAUDE_JOBS_WORKSPACE_TAG = "claude-jobs";

export function isClaudeJobsWorkspace(workspace: {
	projectId: string | null;
	tags?: readonly string[] | null;
}): boolean {
	return (
		workspace.projectId === null &&
		(workspace.tags ?? []).includes(CLAUDE_JOBS_WORKSPACE_TAG)
	);
}

export function isClaudeJobsFolder(section: {
	projectId: string;
	tag?: string | null;
}): boolean {
	return (
		section.projectId === SESSIONS_TAG_SCOPE &&
		section.tag === CLAUDE_JOBS_WORKSPACE_TAG
	);
}
