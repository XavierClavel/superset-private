import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "lib/trpc/routers";
import type { ClaudeJob } from "lib/trpc/routers/claude-jobs/types";

export type ClaudeJobSaveInput =
	inferRouterInputs<AppRouter>["claudeJobs"]["save"];

export type ClaudeJobRepeat = "daily" | "weekdays" | "monthDays" | "cron";

export interface ClaudeJobDraft {
	name: string;
	prompt: string;
	repeat: ClaudeJobRepeat;
	hour: number;
	minute: number;
	/** ISO weekdays, 1 = Monday to 7 = Sunday. */
	weekdays: number[];
	monthDays: number[];
	cron: string;
	/** Null for Claude Jobs' own folder. */
	cwd: string | null;
}

export const NEW_CLAUDE_JOB_DRAFT: ClaudeJobDraft = {
	name: "",
	prompt: "",
	repeat: "daily",
	hour: 9,
	minute: 0,
	weekdays: [1, 2, 3, 4, 5],
	monthDays: [1],
	cron: "",
	cwd: null,
};

export function draftFromJob(job: ClaudeJob): ClaudeJobDraft {
	return {
		name: job.name,
		prompt: job.prompt,
		repeat: job.cron
			? "cron"
			: job.month_days.length > 0
				? "monthDays"
				: job.weekdays.length > 0
					? "weekdays"
					: "daily",
		hour: job.hour,
		minute: job.minute,
		weekdays: job.weekdays,
		monthDays: job.month_days,
		cron: job.cron ?? "",
		cwd: job.cwd,
	};
}

/** Whether Claude Jobs can run the draft: a cron job keeps its days, unused. */
export function canSaveDraft(draft: ClaudeJobDraft): boolean {
	if (!draft.name.trim() || !draft.prompt.trim()) return false;
	if (draft.repeat === "weekdays") return draft.weekdays.length > 0;
	if (draft.repeat === "monthDays") return draft.monthDays.length > 0;
	if (draft.repeat === "cron") return draft.cron.trim().length > 0;
	return true;
}

export function saveInputFromDraft(
	draft: ClaudeJobDraft,
): Omit<ClaudeJobSaveInput, "id"> {
	const { repeat } = draft;
	return {
		name: draft.name.trim(),
		prompt: draft.prompt.trim(),
		hour: draft.hour,
		minute: draft.minute,
		weekdays: repeat === "weekdays" || repeat === "cron" ? draft.weekdays : [],
		month_days:
			repeat === "monthDays" || repeat === "cron" ? draft.monthDays : [],
		cron: repeat === "cron" ? draft.cron.trim() : null,
		cwd: draft.cwd,
	};
}
