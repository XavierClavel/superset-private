import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ClaudeBackgroundTasks } from "./claude-background-tasks";

const dirs: string[] = [];

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
});

function transcript(): string {
	const dir = mkdtempSync(path.join(tmpdir(), "claude-bg-"));
	dirs.push(dir);
	const file = path.join(dir, "session.jsonl");
	writeFileSync(file, "");
	return file;
}

const line = (entry: unknown) => `${JSON.stringify(entry)}\n`;

const launch = (id: string, name: string, input: Record<string, unknown>) =>
	line({
		type: "assistant",
		message: { content: [{ type: "tool_use", id, name, input }] },
	});

const result = (toolUseId: string, toolUseResult: Record<string, unknown>) =>
	line({
		type: "user",
		message: { content: [{ type: "tool_result", tool_use_id: toolUseId }] },
		toolUseResult,
	});

const notification = (...taskIds: string[]) =>
	line({
		type: "queue-operation",
		operation: "enqueue",
		content: `<task-notification>\n${taskIds.map((id) => `<task-id>${id}</task-id>\n`).join("")}<status>completed</status>`,
	});

describe("ClaudeBackgroundTasks", () => {
	test("tracks a background shell and a monitor until they report", async () => {
		const file = transcript();
		const reader = new ClaudeBackgroundTasks(() => 1);
		appendFileSync(
			file,
			launch("tool-1", "Bash", {
				command: "bun dev",
				description: "Start the dev server",
				run_in_background: true,
			}) +
				result("tool-1", { backgroundTaskId: "b1" }) +
				launch("tool-2", "Monitor", { description: "errors in dev.log" }) +
				result("tool-2", { taskId: "m1", timeoutMs: 60000 }),
		);

		expect(await reader.read(file)).toEqual([
			{
				id: "b1",
				kind: "process",
				name: "Start the dev server",
				canStop: false,
				startedAtMs: 1,
			},
			expect.objectContaining({ id: "m1", name: "errors in dev.log" }),
		]);

		appendFileSync(file, notification("b1"));
		expect((await reader.read(file)).map((task) => task.id)).toEqual(["m1"]);
	});

	test("drops a task whose notification comes before its start", async () => {
		const file = transcript();
		appendFileSync(
			file,
			launch("tool-1", "Bash", {
				command: "bun install",
				run_in_background: true,
			}) +
				notification("b1") +
				result("tool-1", { backgroundTaskId: "b1" }),
		);

		expect(await new ClaudeBackgroundTasks().read(file)).toEqual([]);
	});

	test("drops every task a notification names", async () => {
		const file = transcript();
		const reader = new ClaudeBackgroundTasks();
		appendFileSync(
			file,
			launch("tool-1", "Bash", {
				command: "bun dev",
				run_in_background: true,
			}) +
				result("tool-1", { backgroundTaskId: "b1" }) +
				launch("tool-2", "Bash", {
					command: "bun api",
					run_in_background: true,
				}) +
				result("tool-2", { backgroundTaskId: "b2" }),
		);
		expect((await reader.read(file)).map((task) => task.id)).toEqual([
			"b1",
			"b2",
		]);

		appendFileSync(file, notification("b1", "b2"));
		expect(await reader.read(file)).toEqual([]);
	});

	test("drops a background shell that TaskStop stopped", async () => {
		const file = transcript();
		const reader = new ClaudeBackgroundTasks();
		appendFileSync(
			file,
			launch("tool-1", "Bash", {
				command: "bun dev",
				run_in_background: true,
			}) + result("tool-1", { backgroundTaskId: "b1" }),
		);
		expect((await reader.read(file)).map((task) => task.id)).toEqual(["b1"]);

		appendFileSync(
			file,
			launch("tool-2", "TaskStop", { task_id: "b1" }) +
				result("tool-2", {
					message: "Successfully stopped task: b1 (bun dev)",
					task_id: "b1",
					task_type: "local_bash",
					command: "bun dev",
				}),
		);
		expect(await reader.read(file)).toEqual([]);
	});

	test("ignores task ids from other tools and foreground commands", async () => {
		const file = transcript();
		appendFileSync(
			file,
			launch("tool-1", "TaskCreate", { subject: "Write tests" }) +
				result("tool-1", { taskId: "7" }) +
				launch("tool-2", "Bash", { command: "ls" }) +
				result("tool-2", { stdout: "" }),
		);

		expect(await new ClaudeBackgroundTasks().read(file)).toEqual([]);
	});

	test("keeps the description of a background subagent", async () => {
		const file = transcript();
		const reader = new ClaudeBackgroundTasks();
		appendFileSync(
			file,
			result("tool-1", {
				isAsync: true,
				agentId: "a1",
				description: "Review the diff",
			}),
		);
		expect(await reader.read(file)).toEqual([]);
		expect(reader.subagentDescription("a1")).toBe("Review the diff");
	});

	test("loops while a wakeup is scheduled for later", async () => {
		const file = transcript();
		let now = 1_000;
		const reader = new ClaudeBackgroundTasks(() => now);
		appendFileSync(
			file,
			launch("tool-1", "ScheduleWakeup", { delaySeconds: 60, prompt: "/x" }) +
				result("tool-1", { scheduledFor: 61_000, clampedDelaySeconds: 60 }),
		);
		await reader.read(file);
		expect(reader.looping()).toBe(true);

		now = 61_000;
		expect(reader.looping()).toBe(false);

		now = 1_000;
		appendFileSync(
			file,
			launch("tool-2", "ScheduleWakeup", { stop: true }) +
				result("tool-2", { scheduledFor: 0, stopped: true }),
		);
		await reader.read(file);
		expect(reader.looping()).toBe(false);
	});

	test("loops while a recurring cron job lives", async () => {
		const file = transcript();
		const reader = new ClaudeBackgroundTasks();
		appendFileSync(
			file,
			launch("tool-1", "CronCreate", { cron: "0 9 * * *", recurring: false }) +
				result("tool-1", { id: "once", recurring: false }) +
				launch("tool-2", "CronCreate", {
					cron: "*/5 * * * *",
					recurring: true,
				}) +
				result("tool-2", { id: "every5", recurring: true }),
		);
		await reader.read(file);
		expect(reader.looping()).toBe(true);

		appendFileSync(
			file,
			launch("tool-3", "CronDelete", { id: "every5" }) +
				result("tool-3", { id: "every5" }),
		);
		await reader.read(file);
		expect(reader.looping()).toBe(false);
	});

	test("keeps a line split across two reads", async () => {
		const file = transcript();
		const reader = new ClaudeBackgroundTasks();
		const entry = result("tool-1", { backgroundTaskId: "b1" });
		appendFileSync(file, entry.slice(0, 20));
		expect(await reader.read(file)).toEqual([]);
		appendFileSync(file, entry.slice(20));
		expect((await reader.read(file)).map((task) => task.id)).toEqual(["b1"]);
	});
});
