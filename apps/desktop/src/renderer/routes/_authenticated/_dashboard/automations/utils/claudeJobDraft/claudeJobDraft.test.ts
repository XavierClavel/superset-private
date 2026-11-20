import { describe, expect, test } from "bun:test";
import type { ClaudeJob } from "lib/trpc/routers/claude-jobs/types";
import {
	canSaveDraft,
	draftFromJob,
	NEW_CLAUDE_JOB_DRAFT,
	saveInputFromDraft,
} from "./claudeJobDraft";

const JOB: ClaudeJob = {
	id: "weekly-report",
	name: "Weekly report",
	prompt: "/weekly-report",
	hour: 8,
	minute: 30,
	weekdays: [1, 3],
	month_days: [],
	cron: null,
	cwd: "/repo",
	enabled: true,
	event: null,
	next_run: null,
	recent: [],
};

function savedFields(job: ClaudeJob) {
	const { name, prompt, hour, minute, weekdays, month_days, cron, cwd } = job;
	return { name, prompt, hour, minute, weekdays, month_days, cron, cwd };
}

describe("a Claude Jobs job as a form draft", () => {
	test("saving an unchanged draft writes the job's own schedule back", () => {
		for (const job of [
			JOB,
			{ ...JOB, weekdays: [] },
			{ ...JOB, weekdays: [], month_days: [1, 15] },
			{ ...JOB, cron: "0 9 * * 1-5" },
			{ ...JOB, cwd: null },
		]) {
			expect(saveInputFromDraft(draftFromJob(job))).toEqual(savedFields(job));
		}
	});

	test("picking another repeat clears the days it does not use", () => {
		const draft = { ...draftFromJob(JOB), monthDays: [1], cron: "0 9 * * *" };
		expect(saveInputFromDraft({ ...draft, repeat: "daily" })).toMatchObject({
			weekdays: [],
			month_days: [],
			cron: null,
		});
		expect(saveInputFromDraft({ ...draft, repeat: "weekdays" })).toMatchObject({
			weekdays: draft.weekdays,
			month_days: [],
			cron: null,
		});
		expect(saveInputFromDraft({ ...draft, repeat: "monthDays" })).toMatchObject(
			{ weekdays: [], month_days: draft.monthDays, cron: null },
		);
	});

	test("a draft needs a name, a prompt, and something to repeat on", () => {
		const draft = { ...NEW_CLAUDE_JOB_DRAFT, name: "Report", prompt: "/r" };
		expect(canSaveDraft(draft)).toBe(true);
		expect(canSaveDraft({ ...draft, name: " " })).toBe(false);
		expect(canSaveDraft({ ...draft, prompt: "" })).toBe(false);
		expect(canSaveDraft({ ...draft, repeat: "weekdays", weekdays: [] })).toBe(
			false,
		);
		expect(canSaveDraft({ ...draft, repeat: "monthDays", monthDays: [] })).toBe(
			false,
		);
		expect(canSaveDraft({ ...draft, repeat: "cron", cron: " " })).toBe(false);
	});
});
