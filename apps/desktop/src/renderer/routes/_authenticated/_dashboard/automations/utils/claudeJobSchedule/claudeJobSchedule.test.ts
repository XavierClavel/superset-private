import { describe, expect, test } from "bun:test";
import { describeSchedule } from "@superset/shared/rrule";
import { describeClaudeJobSchedule } from "./claudeJobSchedule";

const DAILY = {
	hour: 9,
	minute: 30,
	weekdays: [],
	month_days: [],
	cron: null,
	event: null,
};

describe("describeClaudeJobSchedule", () => {
	test("a job with no days runs every day", () => {
		expect(describeClaudeJobSchedule(DAILY)).toBe("Daily at 9:30 AM");
	});

	test("reads ISO weekdays, 1 being Monday and 7 Sunday", () => {
		expect(describeClaudeJobSchedule({ ...DAILY, weekdays: [1] })).toBe(
			"Every Monday at 9:30 AM",
		);
		expect(describeClaudeJobSchedule({ ...DAILY, weekdays: [6, 7] })).toBe(
			"Weekends at 9:30 AM",
		);
	});

	test("a day of the month makes it monthly", () => {
		expect(describeClaudeJobSchedule({ ...DAILY, month_days: [1] })).toBe(
			describeSchedule("FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=30"),
		);
	});

	test("a cron expression is the schedule, whatever the days", () => {
		expect(
			describeClaudeJobSchedule({
				...DAILY,
				weekdays: [1],
				cron: "0 9 * * 1-5",
			}),
		).toBe("Cron: 0 9 * * 1-5");
	});

	test("a pull-request trigger replaces the schedule", () => {
		const repos = ["o/a", "o/b"];
		expect(
			describeClaudeJobSchedule({
				...DAILY,
				event: { kind: "pull_request_merged", repos, mine: true },
			}),
		).toBe(`When a pull request is merged in ${repos.join(", ")}`);
	});
});
