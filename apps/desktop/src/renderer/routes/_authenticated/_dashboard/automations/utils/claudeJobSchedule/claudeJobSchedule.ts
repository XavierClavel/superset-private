import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import { describeSchedule } from "@superset/shared/rrule";
import type { ClaudeJob } from "lib/trpc/routers/claude-jobs/types";

const ISO_WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

type JobSchedule = Pick<
	ClaudeJob,
	"hour" | "minute" | "weekdays" | "month_days" | "cron" | "event"
>;

function scheduleRrule(job: JobSchedule): string {
	const time = `BYHOUR=${job.hour};BYMINUTE=${job.minute}`;
	if (job.month_days.length > 0) {
		return `FREQ=MONTHLY;BYMONTHDAY=${job.month_days.join(",")};${time}`;
	}
	if (job.weekdays.length > 0) {
		const days = job.weekdays.map((day) => ISO_WEEKDAYS[day - 1]).join(",");
		return `FREQ=WEEKLY;BYDAY=${days};${time}`;
	}
	return `FREQ=DAILY;${time}`;
}

/** When a Claude Jobs job runs, such as "Weekdays at 9:00 AM". */
export function describeClaudeJobSchedule(job: JobSchedule): string {
	if (job.event) {
		const repos = job.event.repos.join(", ");
		return job.event.kind === "pull_request_opened"
			? i18n._(msg({ message: `When a pull request is opened in ${repos}` }))
			: i18n._(msg({ message: `When a pull request is merged in ${repos}` }));
	}
	if (job.cron) return i18n._(msg({ message: `Cron: ${job.cron}` }));
	return describeSchedule(scheduleRrule(job));
}
