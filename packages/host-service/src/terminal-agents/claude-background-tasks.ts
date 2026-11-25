import { open } from "node:fs/promises";
import type { BackgroundTask } from "@superset/chat/protocol";

const READ_CHUNK_BYTES = 1024 * 1024;
const MAX_TRACKED_TASKS = 64;
const NEWLINE = 0x0a;
const TASK_ID = /<task-id>([^<]+)<\/task-id>/;
const LOOP_TOOLS = ["ScheduleWakeup", "CronCreate", "CronDelete"];

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Json)
		: null;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value ? value : undefined;
}

function parseLine(line: string): Json | null {
	try {
		return asObject(JSON.parse(line));
	} catch {
		return null;
	}
}

/**
 * Background shells and monitors of a Claude Code session, read from its
 * transcript. A task starts with the tool result that names it and ends with
 * the `<task-notification>` Claude queues for it, or with the result of the
 * `TaskStop` call that stopped it, for which Claude queues no notification.
 * Hooks give no signal for either. Background subagents are left out: their
 * own hooks report them.
 * Only their descriptions are kept, which hooks do not carry.
 *
 * Also tracks a running `/loop`: a wakeup scheduled for later, or a recurring
 * cron job not yet deleted.
 *
 * Reads only the bytes appended since the last call.
 */
export class ClaudeBackgroundTasks {
	private path: string | null = null;
	private offset = 0;
	private remainder: Buffer = Buffer.alloc(0);
	private readonly launches = new Map<string, string>();
	private readonly running = new Map<string, BackgroundTask>();
	private readonly subagentDescriptions = new Map<string, string>();
	private readonly loopCalls = new Map<string, { name: string; input: Json }>();
	private wakeupAt = 0;
	private readonly crons = new Set<string>();
	/** Changes whenever the tasks, the subagent descriptions or the loop change. */
	revision = 0;
	private pending: Promise<BackgroundTask[]> = Promise.resolve([]);

	constructor(private readonly now: () => number = Date.now) {}

	read(transcriptPath: string): Promise<BackgroundTask[]> {
		this.pending = this.pending
			.catch(() => [])
			.then(() => this.readNow(transcriptPath));
		return this.pending;
	}

	private async readNow(transcriptPath: string): Promise<BackgroundTask[]> {
		if (transcriptPath !== this.path) this.reset(transcriptPath);
		const file = await open(transcriptPath, "r").catch(() => null);
		if (!file) return this.tasks();
		try {
			const { size } = await file.stat();
			if (size < this.offset) this.reset(transcriptPath);
			const chunk = Buffer.alloc(READ_CHUNK_BYTES);
			while (this.offset < size) {
				const { bytesRead } = await file.read(
					chunk,
					0,
					chunk.length,
					this.offset,
				);
				if (bytesRead === 0) break;
				this.offset += bytesRead;
				this.consume(chunk.subarray(0, bytesRead));
			}
		} finally {
			await file.close();
		}
		return this.tasks();
	}

	private reset(transcriptPath: string): void {
		this.path = transcriptPath;
		this.offset = 0;
		this.remainder = Buffer.alloc(0);
		this.launches.clear();
		this.running.clear();
		this.subagentDescriptions.clear();
		this.loopCalls.clear();
		this.wakeupAt = 0;
		this.crons.clear();
		this.revision++;
	}

	looping(): boolean {
		return this.wakeupAt > this.now() || this.crons.size > 0;
	}

	subagentDescription(subagentId: string): string | undefined {
		return this.subagentDescriptions.get(subagentId);
	}

	private consume(bytes: Buffer): void {
		let data = this.remainder.length
			? Buffer.concat([this.remainder, bytes])
			: bytes;
		let newline = data.indexOf(NEWLINE);
		while (newline !== -1) {
			this.line(data.subarray(0, newline).toString("utf8"));
			data = data.subarray(newline + 1);
			newline = data.indexOf(NEWLINE);
		}
		this.remainder = Buffer.from(data);
	}

	private line(line: string): void {
		if (line.includes("<task-notification>")) {
			const entry = parseLine(line);
			if (entry?.type !== "queue-operation" || entry.operation !== "enqueue")
				return;
			const taskId = asString(entry.content)?.match(TASK_ID)?.[1];
			if (taskId && this.running.delete(taskId)) this.revision++;
			return;
		}
		for (const toolUseId of this.loopCalls.keys()) {
			if (line.includes(toolUseId)) {
				this.noteLoopResult(parseLine(line));
				return;
			}
		}
		if (line.includes('"isAsync":true')) {
			this.noteSubagent(parseLine(line));
			return;
		}
		if (
			line.includes('"run_in_background":true') ||
			line.includes('"Monitor"') ||
			LOOP_TOOLS.some((name) => line.includes(`"${name}"`))
		) {
			this.noteLaunches(parseLine(line));
			return;
		}
		if (line.includes('"backgroundTaskId"') || line.includes('"taskId"')) {
			this.noteStart(parseLine(line));
			return;
		}
		if (line.includes('"task_id"')) {
			this.noteStop(parseLine(line));
		}
	}

	private noteStop(entry: Json | null): void {
		if (entry?.type !== "user") return;
		const taskId = asString(asObject(entry.toolUseResult)?.task_id);
		if (taskId && this.running.delete(taskId)) this.revision++;
	}

	private noteLaunches(entry: Json | null): void {
		if (entry?.type !== "assistant") return;
		const content = asObject(entry.message)?.content;
		if (!Array.isArray(content)) return;
		for (const raw of content) {
			const block = asObject(raw);
			const id = asString(block?.id);
			const input = asObject(block?.input);
			if (block?.type !== "tool_use" || !id || !input) continue;
			const name = asString(block.name);
			if (name && LOOP_TOOLS.includes(name)) {
				this.loopCalls.set(id, { name, input });
				continue;
			}
			const isMonitor = name === "Monitor";
			if (!isMonitor && input.run_in_background !== true) continue;
			this.launches.set(
				id,
				asString(input.description) ?? asString(input.command) ?? "",
			);
			if (this.launches.size > MAX_TRACKED_TASKS) {
				const oldest = this.launches.keys().next().value;
				if (oldest !== undefined) this.launches.delete(oldest);
			}
		}
	}

	private noteLoopResult(entry: Json | null): void {
		if (entry?.type !== "user") return;
		const toolUseId = this.toolUseIdOf(entry);
		const call =
			toolUseId === undefined ? undefined : this.loopCalls.get(toolUseId);
		if (!toolUseId || !call) return;
		this.loopCalls.delete(toolUseId);
		const result = asObject(entry.toolUseResult);
		if (call.name === "ScheduleWakeup") {
			const scheduledFor = result?.scheduledFor;
			this.wakeupAt = typeof scheduledFor === "number" ? scheduledFor : 0;
		} else if (call.name === "CronCreate") {
			const cronId = asString(result?.id);
			if (!cronId || result?.recurring !== true) return;
			this.crons.add(cronId);
		} else {
			const cronId = asString(call.input.id);
			if (!cronId || !this.crons.delete(cronId)) return;
		}
		this.revision++;
	}

	private noteSubagent(entry: Json | null): void {
		if (entry?.type !== "user") return;
		const result = asObject(entry.toolUseResult);
		const id = asString(result?.agentId);
		const description = asString(result?.description);
		if (!id || !description) return;
		this.subagentDescriptions.set(id, description);
		this.revision++;
		if (this.subagentDescriptions.size > MAX_TRACKED_TASKS) {
			const oldest = this.subagentDescriptions.keys().next().value;
			if (oldest !== undefined) this.subagentDescriptions.delete(oldest);
		}
	}

	private noteStart(entry: Json | null): void {
		if (entry?.type !== "user") return;
		const result = asObject(entry.toolUseResult);
		if (!result) return;
		const toolUseId = this.toolUseIdOf(entry);
		const launchName =
			toolUseId === undefined ? undefined : this.launches.get(toolUseId);
		const taskId =
			asString(result.backgroundTaskId) ??
			(launchName === undefined ? undefined : asString(result.taskId));
		if (!taskId) return;
		if (toolUseId) this.launches.delete(toolUseId);
		this.running.set(taskId, {
			id: taskId,
			kind: "process",
			name: launchName ?? "",
			canStop: false,
			startedAtMs: this.now(),
		});
		this.revision++;
		if (this.running.size > MAX_TRACKED_TASKS) {
			const oldest = this.running.keys().next().value;
			if (oldest !== undefined) this.running.delete(oldest);
		}
	}

	private toolUseIdOf(entry: Json): string | undefined {
		const content = asObject(entry.message)?.content;
		if (!Array.isArray(content)) return undefined;
		for (const raw of content) {
			const block = asObject(raw);
			if (block?.type === "tool_result") return asString(block.tool_use_id);
		}
		return undefined;
	}

	private tasks(): BackgroundTask[] {
		return [...this.running.values()];
	}
}
