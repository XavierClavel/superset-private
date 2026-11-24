/** The fields of `claude-jobs status` that Paradev reads. */

export type ClaudeJobRunStatus =
	| "running"
	| "ok"
	| "warning"
	| "failed"
	| "timeout"
	| "interrupted";

export type ClaudeJobTrigger =
	| "schedule"
	| "manual"
	| "catch-up"
	| "pull-request";

export interface ClaudeJobRun {
	id: string;
	trigger: ClaudeJobTrigger;
	status: ClaudeJobRunStatus;
	started_at: string;
	ended_at: string | null;
	duration_s: number | null;
	cost_usd: number | null;
	result: string | null;
	error: string | null;
	/** What a running run last said it was doing. */
	progress?: { text: string } | null;
}

export interface ClaudeJobEvent {
	kind: "pull_request_opened" | "pull_request_merged";
	repos: string[];
	mine: boolean;
}

export interface ClaudeJob {
	id: string;
	name: string;
	prompt: string;
	hour: number;
	minute: number;
	/** ISO weekdays, 1 = Monday to 7 = Sunday. Empty means every day, unless `month_days` is set. */
	weekdays: number[];
	month_days: number[];
	cron: string | null;
	/** Null for Claude Jobs' own folder, where a job with no project runs. */
	cwd: string | null;
	enabled: boolean;
	event: ClaudeJobEvent | null;
	next_run: string | null;
	/** The last runs, newest first. */
	recent: ClaudeJobRun[];
}

export type ClaudeJobsStatus =
	| { state: "missing" }
	| { state: "outdated"; version: string }
	| { state: "ready"; jobs: ClaudeJob[] };
