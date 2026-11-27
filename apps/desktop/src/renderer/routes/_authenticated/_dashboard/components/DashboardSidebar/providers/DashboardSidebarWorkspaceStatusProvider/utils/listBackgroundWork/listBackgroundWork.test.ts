import { describe, expect, it } from "bun:test";
import type { BackgroundTask } from "@superset/chat/protocol";
import { listBackgroundWork } from "./listBackgroundWork";

const subagent = (id: string, startedAt: number, description?: string) => ({
	id,
	startedAt,
	lastEventAt: startedAt,
	...(description ? { description } : {}),
});

const task = (overrides: Partial<BackgroundTask>): BackgroundTask => ({
	id: "task",
	kind: "subagent",
	name: "Explore",
	canStop: true,
	startedAtMs: 1,
	...overrides,
});

describe("listBackgroundWork", () => {
	it("lists terminal subagents under an agent that stopped", () => {
		const description = "Review the diff";
		const reviewer = subagent("a", 1_000, description);
		const unnamed = subagent("b", 2_000);
		expect(
			listBackgroundWork(
				[{ terminalId: "t1", subagents: [reviewer, unnamed] }],
				new Map([["t1", "review"]]),
			),
		).toEqual([
			{ description, startedAtMs: reviewer.startedAt },
			{ description: "", startedAtMs: unnamed.startedAt },
		]);
	});

	it("ignores subagents under an agent that is still working", () => {
		expect(
			listBackgroundWork(
				[{ terminalId: "t1", subagents: [subagent("a", 1)] }],
				new Map([["t1", "working"]]),
			),
		).toEqual([]);
	});

	it("lists running chat tasks and shells but not finished subagents", () => {
		const explore = task({ id: "a", startedAtMs: 1_000 });
		const running = task({
			id: "b",
			subagentStatus: "running",
			startedAtMs: 2_000,
		});
		const stopped = task({ id: "c", subagentStatus: "stopped" });
		const shell = task({
			id: "d",
			kind: "process",
			name: "bun dev",
			startedAtMs: 3_000,
		});
		expect(
			listBackgroundWork(
				[
					{
						terminalId: "t1",
						backgroundTasks: [explore, running, stopped, shell],
					},
				],
				new Map([["t1", "idle"]]),
			),
		).toEqual(
			[explore, running, shell].map(({ name, startedAtMs }) => ({
				description: name,
				startedAtMs,
			})),
		);
	});

	it("adds up every agent of the workspace", () => {
		expect(
			listBackgroundWork(
				[
					{ terminalId: "t1", subagents: [subagent("a", 1)] },
					{ terminalId: "t2", backgroundTasks: [task({ id: "b" })] },
				],
				new Map(),
			),
		).toHaveLength(2);
	});
});
