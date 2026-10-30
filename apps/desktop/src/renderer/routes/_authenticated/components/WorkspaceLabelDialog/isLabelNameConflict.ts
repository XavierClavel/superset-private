export function isLabelNameConflict(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const data = (error as { data?: { code?: unknown } }).data;
	return data?.code === "CONFLICT";
}
