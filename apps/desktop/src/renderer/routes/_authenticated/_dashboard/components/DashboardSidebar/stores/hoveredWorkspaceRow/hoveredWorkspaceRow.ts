import { create } from "zustand";

interface HoveredWorkspaceRowState {
	hoveredRowKey: string | null;
	enterRow: (rowKey: string) => void;
	leaveRow: (rowKey: string) => void;
}

/** The sidebar workspace row under the pointer, which keyboard actions target first. */
export const useHoveredWorkspaceRowStore = create<HoveredWorkspaceRowState>()(
	(set, get) => ({
		hoveredRowKey: null,
		enterRow: (rowKey) => {
			if (get().hoveredRowKey !== rowKey) set({ hoveredRowKey: rowKey });
		},
		leaveRow: (rowKey) => {
			if (get().hoveredRowKey === rowKey) set({ hoveredRowKey: null });
		},
	}),
);
