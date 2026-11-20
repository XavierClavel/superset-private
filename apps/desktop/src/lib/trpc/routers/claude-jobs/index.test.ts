import { describe, expect, test } from "bun:test";
import { createClaudeJobsRouter } from ".";
import type { ClaudeJob } from "./types";
import type { ClaudeJobsCli } from "./utils/claude-jobs-cli";

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
			return args[0] === "status" ? JSON.stringify(status) : "";
		},
		open: async () => {},
	};
	return { calls, call: createClaudeJobsRouter(cli).createCaller({} as never) };
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
