export interface WorkspaceLabel {
	id: string;
	name: string;
	color: string;
	sortOrder: number;
}

export interface WorkspaceLabelAssignment {
	workspaceId: string;
	labelId: string;
}

export function indexLabelsByWorkspace(
	labels: WorkspaceLabel[],
	assignments: WorkspaceLabelAssignment[],
): Map<string, WorkspaceLabel[]> {
	const assignedByWorkspace = new Map<string, Set<string>>();
	for (const { workspaceId, labelId } of assignments) {
		const ids = assignedByWorkspace.get(workspaceId) ?? new Set<string>();
		ids.add(labelId);
		assignedByWorkspace.set(workspaceId, ids);
	}
	const result = new Map<string, WorkspaceLabel[]>();
	for (const [workspaceId, ids] of assignedByWorkspace) {
		const matched = labels.filter((label) => ids.has(label.id));
		if (matched.length > 0) result.set(workspaceId, matched);
	}
	return result;
}

export function resolveActiveFilterLabel(
	labels: WorkspaceLabel[],
	filterId: string | null,
): WorkspaceLabel | null {
	if (filterId === null) return null;
	return labels.find((label) => label.id === filterId) ?? null;
}
