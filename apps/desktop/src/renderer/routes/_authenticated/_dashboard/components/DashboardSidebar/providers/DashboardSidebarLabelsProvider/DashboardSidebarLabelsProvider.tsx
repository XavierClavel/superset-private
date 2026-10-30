import { createContext, type ReactNode, useContext } from "react";
import {
	type UseWorkspaceLabelsResult,
	useWorkspaceLabels,
	type WorkspaceLabel,
} from "renderer/hooks/workspace-labels/useWorkspaceLabels";

const DashboardSidebarLabelsContext =
	createContext<UseWorkspaceLabelsResult | null>(null);

const DashboardSidebarLabelsByWorkspaceContext = createContext<ReadonlyMap<
	string,
	WorkspaceLabel[]
> | null>(null);

export function DashboardSidebarLabelsProvider({
	children,
}: {
	children: ReactNode;
}) {
	const value = useWorkspaceLabels();
	return (
		<DashboardSidebarLabelsValueProvider value={value}>
			{children}
		</DashboardSidebarLabelsValueProvider>
	);
}

/** Supplies given labels without the host service, for tests. */
export function DashboardSidebarLabelsValueProvider({
	value,
	children,
}: {
	value: UseWorkspaceLabelsResult;
	children: ReactNode;
}) {
	return (
		<DashboardSidebarLabelsContext.Provider value={value}>
			<DashboardSidebarLabelsByWorkspaceContext.Provider
				value={value.labelsByWorkspaceId}
			>
				{children}
			</DashboardSidebarLabelsByWorkspaceContext.Provider>
		</DashboardSidebarLabelsContext.Provider>
	);
}

export function useDashboardSidebarLabels(): UseWorkspaceLabelsResult {
	const context = useContext(DashboardSidebarLabelsContext);
	if (!context) {
		throw new Error(
			"useDashboardSidebarLabels must be used within DashboardSidebarLabelsProvider",
		);
	}
	return context;
}

export function useDashboardSidebarLabelsByWorkspace(): ReadonlyMap<
	string,
	WorkspaceLabel[]
> {
	const context = useContext(DashboardSidebarLabelsByWorkspaceContext);
	if (!context) {
		throw new Error(
			"useDashboardSidebarLabelsByWorkspace must be used within DashboardSidebarLabelsProvider",
		);
	}
	return context;
}
