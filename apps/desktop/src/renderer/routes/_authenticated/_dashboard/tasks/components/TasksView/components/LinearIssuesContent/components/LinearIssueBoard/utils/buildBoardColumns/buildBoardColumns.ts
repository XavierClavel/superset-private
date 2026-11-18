import type { LinearState } from "../../../../../../../../utils/linearIssueTypes";
import {
	STATUS_FILTER_VALUES,
	type StatusFilterValue,
} from "../../../../../../../../utils/statusFilter";

type ColumnType = StatusFilterValue;

export interface BoardColumn {
	key: string;
	name: string;
	type: ColumnType;
	color: string;
	stateId: string | null;
}

const TYPE_ORDER: readonly ColumnType[] = STATUS_FILTER_VALUES;

const TYPE_COLORS: Record<ColumnType, string> = {
	backlog: "#95a2b3",
	unstarted: "#e2e2e2",
	started: "#f2c94c",
	completed: "#5e6ad2",
	canceled: "#95a2b3",
};

function columnType(stateType: LinearState["type"]): ColumnType {
	return stateType === "triage" ? "backlog" : stateType;
}

export function columnKeyFor(state: LinearState, byTeamState: boolean): string {
	return byTeamState ? state.id : columnType(state.type);
}

export function buildBoardColumns({
	teamStates,
	statuses,
	typeNames,
}: {
	teamStates: LinearState[] | undefined;
	statuses: StatusFilterValue[];
	typeNames: Record<ColumnType, string>;
}): BoardColumn[] {
	const visibleTypes = new Set(statuses.length > 0 ? statuses : TYPE_ORDER);
	if (teamStates) {
		return teamStates
			.filter((state) => visibleTypes.has(columnType(state.type)))
			.sort(
				(a, b) =>
					TYPE_ORDER.indexOf(columnType(a.type)) -
						TYPE_ORDER.indexOf(columnType(b.type)) || a.position - b.position,
			)
			.map((state) => ({
				key: state.id,
				name: state.name,
				type: columnType(state.type),
				color: state.color,
				stateId: state.id,
			}));
	}
	return TYPE_ORDER.filter((type) => visibleTypes.has(type)).map((type) => ({
		key: type,
		name: typeNames[type],
		type,
		color: TYPE_COLORS[type],
		stateId: null,
	}));
}
