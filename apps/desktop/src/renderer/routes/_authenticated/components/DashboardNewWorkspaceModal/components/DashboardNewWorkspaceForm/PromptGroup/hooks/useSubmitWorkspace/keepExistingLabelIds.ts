export function keepExistingLabelIds(
	labelIds: string[],
	existingLabels: { id: string }[],
): string[] {
	const existing = new Set(existingLabels.map((label) => label.id));
	return labelIds.filter((id) => existing.has(id));
}
