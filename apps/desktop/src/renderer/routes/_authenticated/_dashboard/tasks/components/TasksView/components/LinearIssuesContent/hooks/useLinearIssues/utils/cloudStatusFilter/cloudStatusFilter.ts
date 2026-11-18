import type { StatusFilterValue } from "../../../../../../../../utils/statusFilter";

/**
 * The hosted API takes one status, so several go as the narrowest status that
 * covers them all. The caller drops the extra issues.
 */
export function cloudStatusFilter(
	statuses: readonly StatusFilterValue[],
): StatusFilterValue | "all" | "active" | "open" {
	const [onlyStatus] = statuses;
	if (statuses.length === 1 && onlyStatus) return onlyStatus;
	if (statuses.length === 0) return "all";
	if (
		statuses.every((status) => status === "unstarted" || status === "started")
	)
		return "active";
	if (
		statuses.every((status) => status !== "completed" && status !== "canceled")
	)
		return "open";
	return "all";
}
