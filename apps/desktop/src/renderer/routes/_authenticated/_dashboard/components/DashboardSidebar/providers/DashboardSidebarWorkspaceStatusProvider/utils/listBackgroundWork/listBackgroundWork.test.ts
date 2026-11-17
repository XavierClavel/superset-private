import { describe, expect, it } from "bun:test";
import type { BackgroundTask } from "@superset/chat/protocol";
import { listBackgroundWork } from "./listBackgroundWork";

const subagent = (id: string, description?: string) => ({
	id,
	startedAt: 1,
	lastEventAt: 1,
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
		expect(
			listBackgroundWork(
				[
					{
						terminalId: "t1",
						subagents: [subagent("a", "Review the diff"), subagent("b")],
					},
				],
				new Map([["t1", "review"]]),
			),
		).toEqual(["Review the diff", ""]);
	});

	it("ignores subagents under an agent that is still working", () => {
		expect(
			listBackgroundWork(
				[{ terminalId: "t1", subagents: [subagent("a")] }],
				new Map([["t1", "working"]]),
			),
		).toEqual([]);
	});

	it("lists running chat tasks and shells but not finished subagents", () => {
		expect(
			listBackgroundWork(
				[
					{
						terminalId: "t1",
						backgroundTasks: [
							task({ id: "a" }),
							task({ id: "b", subagentStatus: "running" }),
							task({ id: "c", subagentStatus: "stopped" }),
							task({ id: "d", kind: "process", name: "bun dev" }),
						],
					},
				],
				new Map([["t1", "idle"]]),
			),
		).toEqual(["Explore", "Explore", "bun dev"]);
	});

	it("adds up every agent of the workspace", () => {
		expect(
			listBackgroundWork(
				[
					{ terminalId: "t1", subagents: [subagent("a")] },
					{ terminalId: "t2", backgroundTasks: [task({ id: "b" })] },
				],
				new Map(),
			),
		).toHaveLength(2);
	});
});
