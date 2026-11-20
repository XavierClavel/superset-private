import { describe, expect, test } from "bun:test";
import { createClaudeJobsRouter } from ".";
import type { ClaudeJob } from "./types";
import type { ClaudeJobsCli } from "./utils/claude-jobs-cli";

const DEFAULT_CWD = "/Users/me/.claude-jobs/workspace";

const JOB: ClaudeJob = {
	id: "daily-report",
	name: "Daily report",
	prompt: "/daily-report",
	hour: 9,
	minute: 0,
	weekdays: [],
	month_days: [],
	cron: null,
	cwd: "/tmp",
	enabled: true,
	event: null,
	next_run: null,
	recent: [],
};

function caller(
	version: string | null,
	status: object = { version: 1, jobs: [JOB] },
) {
	const calls: Array<{ args: string[]; input?: string }> = [];
	const cli: ClaudeJobsCli = {
		version: async () => version,
		run: async (args, input) => {
			calls.push({ args, input });
			if (args[0] === "status") return JSON.stringify(status);
			if (args[0] === "save") return input ?? "";
			return "";
		},
		open: async () => {},
	};
	return {
		calls,
		call: createClaudeJobsRouter(cli, DEFAULT_CWD).createCaller({} as never),
	};
}

describe("Claude Jobs as the automations of a free plan", () => {
	test("without Claude Jobs, says so and runs nothing", async () => {
		const { call, calls } = caller(null);
		expect(await call.status()).toEqual({ state: "missing" });
		expect(calls).toEqual([]);
	});

	test("an app without the delete command is outdated and is never called", async () => {
		const { call, calls } = caller("0.14.0");
		expect(await call.status()).toEqual({
			state: "outdated",
			version: "0.14.0",
		});
		await expect(call.delete({ id: JOB.id })).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
		expect(calls).toEqual([]);
	});

	test("lists the jobs the app reports", async () => {
		const { call } = caller("0.15.0");
		expect(await call.status()).toEqual({ state: "ready", jobs: [JOB] });
	});

	test("refuses a status format it does not know", async () => {
		const { call } = caller("1.0.0", { version: 2, jobs: [] });
		await expect(call.status()).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
	});

	test("pauses a job by saving only its enabled field", async () => {
		const { call, calls } = caller("0.15.0");
		await call.setEnabled({ id: JOB.id, enabled: false });
		expect(calls).toEqual([
			{
				args: ["save"],
				input: JSON.stringify({ id: JOB.id, enabled: false }),
			},
		]);
	});

	test("a job in Claude Jobs' own folder has no project, and keeps that folder when saved", async () => {
		const { call, calls } = caller("0.15.0", {
			version: 1,
			jobs: [{ ...JOB, cwd: DEFAULT_CWD }],
		});
		expect(await call.status()).toEqual({
			state: "ready",
			jobs: [{ ...JOB, cwd: null }],
		});
		await call.save({ ...JOB, cwd: null });
		expect(JSON.parse(calls.at(-1)?.input ?? "{}").cwd).toBe(DEFAULT_CWD);
	});

	test("a new job gets an id no job has, and saves only the fields edited here", async () => {
		const { call, calls } = caller("0.15.0");
		const { id: _, recent, enabled, event, next_run, ...fields } = JOB;
		const saved = await call.save(fields);
		const sent = JSON.parse(calls.at(-1)?.input ?? "{}");
		expect(sent).toEqual({ ...fields, id: `${JOB.id}-2` });
		expect(saved).toEqual({ id: sent.id });
	});

	test("starts and deletes the job asked for", async () => {
		const { call, calls } = caller("0.15.0");
		await call.start({ id: JOB.id });
		await call.delete({ id: JOB.id });
		expect(calls.map((c) => c.args)).toEqual([
			["start", JOB.id],
			["delete", JOB.id],
		]);
	});
});
