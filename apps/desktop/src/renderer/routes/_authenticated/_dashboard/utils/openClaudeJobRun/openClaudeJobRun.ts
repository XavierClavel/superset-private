import type { HostServiceClient } from "renderer/lib/host-service-client";
import { isClaudeJobsWorkspace } from "../claudeJobsWorkspace";

export interface OpenedRun {
	workspaceId: string;
	sessionId: string;
	terminalId: string | null;
}

/**
 * Opens a finished Claude Jobs run as a chat in the shared workspace, created
 * the first time. A run already open there is reused, not opened twice.
 */
export async function openClaudeJobRun({
	client,
	harnessSessionId,
	createWorkspace,
}: {
	client: HostServiceClient;
	harnessSessionId: string;
	createWorkspace: () => Promise<string>;
}): Promise<OpenedRun> {
	const workspaces = await client.workspace.list.query();
	const shared = workspaces.find(isClaudeJobsWorkspace);
	const workspaceId = shared?.id ?? (await createWorkspace());

	const sessions = shared
		? await client.sessions.list.query({ workspaceId, limit: 200 })
		: [];
	const open = sessions.find(
		(session) =>
			session.harnessSessionId === harnessSessionId &&
			session.closedAt === null,
	);
	if (open) {
		return {
			workspaceId,
			sessionId: open.sessionId,
			terminalId: open.terminalId,
		};
	}

	const created = await client.sessions.create.mutate({
		workspaceId,
		agent: "claude",
		resumeSessionId: harnessSessionId,
	});
	return {
		workspaceId,
		sessionId: created.sessionId,
		terminalId: created.terminalId,
	};
}
