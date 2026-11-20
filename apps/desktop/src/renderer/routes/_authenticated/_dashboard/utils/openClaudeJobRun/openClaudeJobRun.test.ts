import { describe, expect, test } from "bun:test";
import type { HostServiceClient } from "renderer/lib/host-service-client";
import { CLAUDE_JOBS_WORKSPACE_TAG } from "../claudeJobsWorkspace";
import { openClaudeJobRun } from "./openClaudeJobRun";

const RUN_SESSION = "fc9652a7-1d7f-4456-b149-ccdc83a7a4f7";

interface FakeSession {
	sessionId: string;
	terminalId: string;
	harnessSessionId: string;
	closedAt: number | null;
}

function fakeHost({
	workspaces,
	sessions = [],
}: {
	workspaces: Array<{ id: string; projectId: string | null; tags: string[] }>;
	sessions?: FakeSession[];
}) {
	const created: Array<{ workspaceId: string; resumeSessionId: string }> = [];
	const client = {
		workspace: { list: { query: async () => workspaces } },
		sessions: {
			list: { query: async () => sessions },
			create: {
				mutate: async (input: {
					workspaceId: string;
					resumeSessionId: string;
				}) => {
					created.push(input);
					return { sessionId: "new-chat", terminalId: "new-terminal" };
				},
			},
		},
	} as unknown as HostServiceClient;
	return { client, created };
}

const SHARED = {
	id: "shared",
	projectId: null,
	tags: [CLAUDE_JOBS_WORKSPACE_TAG],
};

describe("opening a Claude Jobs run as a chat", () => {
	test("creates the shared workspace the first time and resumes the run there", async () => {
		const { client, created } = fakeHost({
			workspaces: [
				{ id: "project", projectId: "p", tags: [CLAUDE_JOBS_WORKSPACE_TAG] },
				{ id: "other-session", projectId: null, tags: [] },
			],
		});
		const opened = await openClaudeJobRun({
			client,
			harnessSessionId: RUN_SESSION,
			createWorkspace: async () => "created",
		});
		expect(opened).toEqual({
			workspaceId: "created",
			sessionId: "new-chat",
			terminalId: "new-terminal",
		});
		expect(created).toMatchObject([
			{ workspaceId: "created", resumeSessionId: RUN_SESSION },
		]);
	});

	test("reuses the shared workspace and a chat of the run still open in it", async () => {
		const open: FakeSession = {
			sessionId: "open-chat",
			terminalId: "open-terminal",
			harnessSessionId: RUN_SESSION,
			closedAt: null,
		};
		const { client, created } = fakeHost({
			workspaces: [SHARED],
			sessions: [
				{ ...open, sessionId: "other-run-chat", harnessSessionId: "other-run" },
				{ ...open, sessionId: "closed-chat", closedAt: 1 },
				open,
			],
		});
		const opened = await openClaudeJobRun({
			client,
			harnessSessionId: RUN_SESSION,
			createWorkspace: async () => {
				throw new Error("must not create a second workspace");
			},
		});
		expect(opened).toEqual({
			workspaceId: SHARED.id,
			sessionId: open.sessionId,
			terminalId: open.terminalId,
		});
		expect(created).toEqual([]);
	});

	test("resumes a run whose chat was closed in a new chat", async () => {
		const { client, created } = fakeHost({
			workspaces: [SHARED],
			sessions: [
				{
					sessionId: "closed-chat",
					terminalId: "t",
					harnessSessionId: RUN_SESSION,
					closedAt: 1,
				},
			],
		});
		const opened = await openClaudeJobRun({
			client,
			harnessSessionId: RUN_SESSION,
			createWorkspace: async () => "unused",
		});
		expect(opened.sessionId).toBe("new-chat");
		expect(created).toMatchObject([
			{ workspaceId: SHARED.id, resumeSessionId: RUN_SESSION },
		]);
	});
});
