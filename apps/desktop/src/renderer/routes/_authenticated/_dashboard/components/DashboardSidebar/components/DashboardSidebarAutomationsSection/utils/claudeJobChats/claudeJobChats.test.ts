import { describe, expect, test } from "bun:test";
import type {
	ClaudeJob,
	ClaudeJobRun,
} from "lib/trpc/routers/claude-jobs/types";
import { claudeJobChats, type ListedChat } from "./claudeJobChats";

function chat(overrides: Partial<ListedChat> & { sessionId: string }) {
	return {
		harnessSessionId: "run-a",
		status: "idle",
		live: true,
		updatedAt: 1,
		closedAt: null,
		closedByUser: false,
		...overrides,
	};
}

function job(name: string, runs: Array<Partial<ClaudeJobRun>>): ClaudeJob {
	return {
		id: name,
		name,
		prompt: "",
		hour: 9,
		minute: 0,
		weekdays: [],
		month_days: [],
		cron: null,
		cwd: null,
		enabled: true,
		event: null,
		next_run: null,
		recent: runs.map((run) => ({
			id: "run",
			trigger: "schedule",
			status: "ok",
			started_at: "2026-11-19T09:00:00Z",
			ended_at: null,
			duration_s: null,
			cost_usd: null,
			result: null,
			error: null,
			session_id: null,
			...run,
		})),
	};
}

describe("the Claude Jobs runs continued in a chat", () => {
	test("leaves out the runs only opened, and shows a reopened run once", () => {
		const chats = claudeJobChats({
			chats: [
				chat({ sessionId: "closed", harnessSessionId: "run-a", closedAt: 2 }),
				chat({ sessionId: "reopened", harnessSessionId: "run-a" }),
				chat({ sessionId: "read-only", harnessSessionId: "run-b" }),
				chat({ sessionId: "no-agent-session", harnessSessionId: null }),
			],
			prompted: ["closed", "no-agent-session"],
			jobs: [],
		});
		expect(
			chats.map(({ harnessSessionId, chatIds }) => [harnessSessionId, chatIds]),
		).toEqual([["run-a", ["closed", "reopened"]]]);
	});

	test("leaves out a run a person closed, until it is opened again", () => {
		const removed = chat({
			sessionId: "removed",
			harnessSessionId: "run-a",
			closedAt: 2,
			closedByUser: true,
		});
		const closedByTheHost = chat({
			sessionId: "replaced",
			harnessSessionId: "run-b",
			closedAt: 2,
		});
		const listed = (chats: ListedChat[]) =>
			claudeJobChats({
				chats,
				prompted: ["removed", "replaced"],
				jobs: [],
			}).map((run) => run.harnessSessionId);

		expect(listed([removed, closedByTheHost])).toEqual(["run-b"]);
		expect(
			listed([
				removed,
				chat({ sessionId: "reopened", harnessSessionId: "run-a" }),
			]),
		).toEqual(["run-a"]);
	});

	test("puts the latest activity first and says when a chat is running", () => {
		const chats = claudeJobChats({
			chats: [
				chat({ sessionId: "older", harnessSessionId: "run-a", updatedAt: 5 }),
				chat({
					sessionId: "newer",
					harnessSessionId: "run-b",
					updatedAt: 9,
					status: "running",
				}),
				chat({
					sessionId: "stopped",
					harnessSessionId: "run-a",
					status: "running",
					live: false,
				}),
			],
			prompted: ["older", "newer"],
			jobs: [],
		});
		expect(
			chats.map(({ harnessSessionId, isRunning }) => [
				harnessSessionId,
				isRunning,
			]),
		).toEqual([
			["run-b", true],
			["run-a", false],
		]);
	});

	test("names a run after its job, and dates a run Claude Jobs no longer lists by its chat", () => {
		const chats = claudeJobChats({
			chats: [
				chat({ sessionId: "listed", harnessSessionId: "run-a", updatedAt: 9 }),
				chat({ sessionId: "old", harnessSessionId: "run-old", updatedAt: 7 }),
			],
			prompted: ["listed", "old"],
			jobs: [job("Photobook monitor", [{ session_id: "run-a" }, {}])],
		});
		expect(chats).toEqual([
			{
				harnessSessionId: "run-a",
				jobName: "Photobook monitor",
				at: Date.parse("2026-11-19T09:00:00Z"),
				isRunning: false,
				chatIds: ["listed"],
			},
			{
				harnessSessionId: "run-old",
				jobName: null,
				at: 7,
				isRunning: false,
				chatIds: ["old"],
			},
		]);
	});
});
