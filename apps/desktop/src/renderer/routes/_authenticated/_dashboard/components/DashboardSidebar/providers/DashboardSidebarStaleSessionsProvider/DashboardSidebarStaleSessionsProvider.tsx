import { createContext, useContext } from "react";

const StaleSessionIdsContext = createContext<ReadonlySet<string>>(new Set());

export const DashboardSidebarStaleSessionsProvider =
	StaleSessionIdsContext.Provider;

export function useIsStaleSession(workspaceId: string): boolean {
	return useContext(StaleSessionIdsContext).has(workspaceId);
}
