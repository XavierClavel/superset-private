import { describe, expect, it } from "bun:test";
import type { BackgroundTask } from "@superset/chat/protocol";
import { deriveTerminalAgentStatus } from "renderer/hooks/host-service/useTerminalAgentStatuses";
import { isWorkspaceWaiting } from "./isWorkspaceWaiting";

type Binding =
	Parameters<typeof isWorkspaceWaiting>[0] extends Iterable<infer B>
		? B
		: never;

function check(bindings: Binding[]): boolean {
	const statuses = new Map(
		bindings.map((binding) => [
			binding.terminalId,
			deriveTerminalAgentStatus({
				lastEventType: binding.lastEventType,
				lastEventAt: 2,
				lastSeenAt: 1,
				looping: binding.looping,
			}),
		]),
	);
	return isWorkspaceWaiting(bindings, statuses);
}

const backgroundShell = (subagentStatus?: BackgroundTask["subagentStatus"]) =>
	({
		id: "shell",
		kind: "process",
		name: "bun test",
		canStop: true,
		startedAtMs: 1,
		...(subagentStatus ? { subagentStatus } : {}),
	}) satisfies BackgroundTask;

const waitingLoop: Binding = {
	terminalId: "loop",
	lastEventType: "Stop",
	looping: true,
};
const waitingSubagent: Binding = {
	terminalId: "parent",
	lastEventType: "Stop",
	subagents: [{ id: "child", startedAt: 1, lastEventAt: 1 }],
};

describe("isWorkspaceWaiting", () => {
	it("waits while a loop will start the next turn", () => {
		expect(check([waitingLoop])).toBe(true);
	});

	it("waits while an agent that stopped still runs background work", () => {
		expect(check([waitingSubagent])).toBe(true);
		expect(
			check([
				{
					terminalId: "t",
					lastEventType: "Stop",
					backgroundTasks: [backgroundShell()],
				},
			]),
		).toBe(true);
	});

	it("does not wait on background work that has ended", () => {
		expect(
			check([
				{
					terminalId: "t",
					lastEventType: "Stop",
					backgroundTasks: [backgroundShell("stopped")],
				},
			]),
		).toBe(false);
	});

	it("does not wait while an agent runs a turn", () => {
		expect(
			check([{ terminalId: "loop", lastEventType: "Start", looping: true }]),
		).toBe(false);
		expect(
			check([waitingLoop, { terminalId: "busy", lastEventType: "Start" }]),
		).toBe(false);
	});

	it("lets an agent that needs input or failed show its own state", () => {
		expect(
			check([
				waitingSubagent,
				{ terminalId: "blocked", lastEventType: "PermissionRequest" },
			]),
		).toBe(false);
		expect(
			check([waitingLoop, { terminalId: "broken", lastEventType: "Failed" }]),
		).toBe(false);
	});

	it("does not wait when nothing will start a turn", () => {
		expect(check([{ terminalId: "done", lastEventType: "Stop" }])).toBe(false);
	});
});
