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

/** Filter key for workspaces that have no label. */
export const NO_LABEL_FILTER_KEY = "no-label";

function allFilterKeys(labels: WorkspaceLabel[]): string[] {
	return [...labels.map((label) => label.id), NO_LABEL_FILTER_KEY];
}

/** `null` means no filter: every workspace shows. Unknown keys are dropped. */
export function resolveActiveFilterKeys(
	labels: WorkspaceLabel[],
	storedKeys: readonly string[] | null,
): ReadonlySet<string> | null {
	if (storedKeys === null) return null;
	const known = new Set(allFilterKeys(labels));
	const active = new Set(storedKeys.filter((key) => known.has(key)));
	return active.size === 0 ? null : active;
}

export function selectOnlyFilterKey(
	active: ReadonlySet<string> | null,
	key: string,
): string[] | null {
	return active?.size === 1 && active.has(key) ? null : [key];
}

export function toggleFilterKey(
	labels: WorkspaceLabel[],
	active: ReadonlySet<string> | null,
	key: string,
): string[] | null {
	const all = allFilterKeys(labels);
	const current = active ?? new Set(all);
	const next = all.filter((candidate) =>
		candidate === key ? !current.has(candidate) : current.has(candidate),
	);
	return next.length === 0 || next.length === all.length ? null : next;
}
