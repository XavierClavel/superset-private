import { create } from "zustand";
import type { ProjectTreeDropIndicator } from "../../utils/resolveProjectTreeDrop";

interface ProjectTreeDropIndicatorState {
	indicator: ProjectTreeDropIndicator | null;
	setIndicator: (indicator: ProjectTreeDropIndicator | null) => void;
}

/**
 * Where a dragged project or folder will land. A store instead of the DnD
 * context so a pointer move re-renders only the rows whose indicator changes.
 */
export const useProjectTreeDropIndicatorStore =
	create<ProjectTreeDropIndicatorState>()((set, get) => ({
		indicator: null,
		setIndicator: (indicator) => {
			const current = get().indicator;
			if (
				current?.rowId === indicator?.rowId &&
				current?.kind === indicator?.kind
			) {
				return;
			}
			set({ indicator });
		},
	}));

/** The indicator kind for one row, or null when it is not the drop target. */
export function useProjectTreeRowDropIndicator(rowId: string) {
	return useProjectTreeDropIndicatorStore((state) =>
		state.indicator?.rowId === rowId ? state.indicator.kind : null,
	);
}
