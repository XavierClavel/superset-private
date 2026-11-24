import type { ClaudeJob } from "lib/trpc/routers/claude-jobs/types";

export interface ListedChat {
	sessionId: string;
	harnessSessionId: string | null;
	status: string;
	live: boolean;
	updatedAt: number;
	closedAt: number | null;
	closedByUser: boolean;
}

export interface ClaudeJobChat {
	harnessSessionId: string;
	/** Null for a run Claude Jobs no longer lists. */
	jobName: string | null;
	/** When the run started, else when its chat was last active. */
	at: number;
	isRunning: boolean;
	/** Every chat of the run, which removing the run closes. */
	chatIds: string[];
}

/**
 * The runs whose chats took a prompt after the job's result, newest activity
 * first. A run reopened after a close has several chats and shows once. A run
 * whose chats are all closed, one of them by a person, was removed.
 */
export function claudeJobChats({
	chats,
	prompted,
	jobs,
}: {
	chats: readonly ListedChat[];
	prompted: readonly string[];
	jobs: readonly ClaudeJob[];
}): ClaudeJobChat[] {
	const promptedIds = new Set(prompted);
	const runs = new Map(
		jobs.flatMap((job) =>
			job.recent.flatMap((run) =>
				run.session_id
					? [[run.session_id, { jobName: job.name, startedAt: run.started_at }]]
					: [],
			),
		),
	);
	const byRun = new Map<string, ListedChat[]>();
	for (const chat of chats) {
		if (!chat.harnessSessionId) continue;
		byRun.set(chat.harnessSessionId, [
			...(byRun.get(chat.harnessSessionId) ?? []),
			chat,
		]);
	}
	return [...byRun]
		.filter(
			([, runChats]) =>
				runChats.some((chat) => promptedIds.has(chat.sessionId)) &&
				!isRemoved(runChats),
		)
		.map(([harnessSessionId, runChats]) => ({
			harnessSessionId,
			runChats,
			lastActivityAt: Math.max(...runChats.map((chat) => chat.updatedAt)),
		}))
		.sort((left, right) => right.lastActivityAt - left.lastActivityAt)
		.map(({ harnessSessionId, runChats, lastActivityAt }) => {
			const run = runs.get(harnessSessionId);
			return {
				harnessSessionId,
				jobName: run?.jobName ?? null,
				at: run ? Date.parse(run.startedAt) : lastActivityAt,
				isRunning: runChats.some(
					(chat) => chat.live && chat.status === "running",
				),
				chatIds: runChats.map((chat) => chat.sessionId),
			};
		});
}

function isRemoved(runChats: readonly ListedChat[]): boolean {
	return (
		runChats.every((chat) => chat.closedAt !== null) &&
		runChats.some((chat) => chat.closedByUser)
	);
}
