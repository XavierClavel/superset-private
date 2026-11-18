export const STATUS_FILTER_VALUES = [
	"backlog",
	"unstarted",
	"started",
	"completed",
	"canceled",
] as const;

export type StatusFilterValue = (typeof STATUS_FILTER_VALUES)[number];

/** No status selected keeps every status. Linear's triage counts as backlog. */
export function matchesStatusFilter(
	statusType: string,
	statuses: readonly StatusFilterValue[],
): boolean {
	if (statuses.length === 0) return true;
	const status = statusType === "triage" ? "backlog" : statusType;
	return statuses.includes(status as StatusFilterValue);
}

export function parseStatusFilter(value: unknown): StatusFilterValue[] {
	const parts = typeof value === "string" ? value.split(",") : value;
	if (!Array.isArray(parts)) return [];
	return STATUS_FILTER_VALUES.filter((status) => parts.includes(status));
}

export function serializeStatusFilter(
	statuses: readonly StatusFilterValue[],
): string | undefined {
	return statuses.length > 0 ? statuses.join(",") : undefined;
}
