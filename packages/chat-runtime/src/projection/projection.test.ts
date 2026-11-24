import { beforeEach, describe, expect, test } from "bun:test";
import type { ChatRuntime } from "../index";
import { sessionState } from "../testing/fixtures";
import { createTestRuntime } from "../testing/testRuntime";
import { setHarnessSessionId } from "./projection";

describe("ChatSessionStore", () => {
	let runtime: ChatRuntime;

	beforeEach(() => {
		runtime = createTestRuntime();
		runtime.journal.open({
			sessionId: "s1",
			scopeId: "w1",
			harness: "claude-code",
		});
		runtime.journal.open({
			sessionId: "s2",
			scopeId: "w2",
			harness: "codex",
		});
	});

	test("lists sessions and filters by workspace", () => {
		expect(
			runtime.sessions
				.list()
				.map((row) => row.sessionId)
				.sort(),
		).toEqual(["s1", "s2"]);
		expect(
			runtime.sessions.listByScope("w2").map((row) => row.harness),
		).toEqual(["codex"]);
	});

	test("keeps the harness session id the agent reports", () => {
		runtime.journal.append("s1", {
			type: "session",
			session: sessionState({ harnessSessionId: "agent-session-1" }),
		});
		runtime.journal.append("s1", {
			type: "session",
			session: sessionState({ status: "running" }),
		});
		expect(runtime.sessions.get("s1")).toMatchObject({
			harnessSessionId: "agent-session-1",
		});
	});

	test("backfills a harness session id that only the journal has", () => {
		runtime.journal.append("s1", {
			type: "session",
			session: sessionState({ harnessSessionId: "agent-session-1" }),
		});
		setHarnessSessionId(runtime.db, "s1", null);
		runtime.journal.forget("s1");

		const { session } = runtime.commands.getSession({ sessionId: "s1" });

		expect(session?.harnessSessionId).toBe("agent-session-1");
	});

	test("reflects journal projection writes", () => {
		runtime.journal.append("s1", {
			type: "session",
			session: sessionState({ status: "awaiting_input", title: "Needs input" }),
		});
		expect(runtime.sessions.get("s1")).toMatchObject({
			status: "awaiting_input",
			title: "Needs input",
		});
	});

	test("a new session is open, and reopening a closed one opens it again", () => {
		expect(runtime.sessions.get("s1")?.closedAt).toBeNull();
		runtime.sessions.markClosed("s1", { closedAt: 5, byUser: true });
		runtime.journal.open({
			sessionId: "s1",
			scopeId: "w1",
			harness: "claude-code",
		});
		expect(runtime.sessions.get("s1")).toMatchObject({
			closedAt: null,
			closedByUser: false,
		});
	});

	test("a close by a person stays recorded when the chat is closed again internally", () => {
		expect(runtime.sessions.get("s1")?.closedByUser).toBe(false);
		runtime.sessions.markClosed("s1", { closedAt: 5, byUser: true });
		runtime.sessions.markClosed("s1", { closedAt: 6 });
		expect(runtime.sessions.get("s1")).toMatchObject({
			closedAt: 6,
			closedByUser: true,
		});
	});

	test("returns null for an unknown session", () => {
		expect(runtime.sessions.get("nope")).toBeNull();
	});

	test("lists the chats of a scope that took a prompt sent through Paradev", () => {
		const userMessage = (sessionId: string, clientId?: string) =>
			runtime.journal.append(sessionId, {
				type: "item",
				turnId: `${sessionId}-turn`,
				item: {
					id: `${sessionId}-prompt`,
					kind: "user_message",
					startedAtMs: 1,
					content: [{ type: "text", text: "go on" }],
					...(clientId ? { clientId } : {}),
				},
			});
		runtime.journal.open({
			sessionId: "replayed",
			scopeId: "w1",
			harness: "claude-code",
		});
		userMessage("replayed");
		userMessage("s1");
		userMessage("s1", "client-1");
		userMessage("s2", "client-2");

		expect(runtime.sessions.promptedInScope("w1")).toEqual(["s1"]);
	});
});
