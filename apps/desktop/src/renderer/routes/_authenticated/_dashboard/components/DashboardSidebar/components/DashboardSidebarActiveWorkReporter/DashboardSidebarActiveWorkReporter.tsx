import { useEffect, useMemo, useRef } from "react";
import { useSidebarWorkspaceStatuses } from "../../providers/DashboardSidebarWorkspaceStatusProvider";
import { listActiveWorkspaceIds } from "../../utils/filterDashboardSidebarByActiveWork";

interface DashboardSidebarActiveWorkReporterProps {
	openWorkspaceId: string | null;
	onChange: (activeWorkspaceIds: ReadonlySet<string>) => void;
}

/**
 * Statuses live in DashboardSidebarWorkspaceStatusProvider, below the
 * component that filters the Projects list, so this reports them back up.
 */
export function DashboardSidebarActiveWorkReporter({
	openWorkspaceId,
	onChange,
}: DashboardSidebarActiveWorkReporterProps) {
	const statuses = useSidebarWorkspaceStatuses();
	const activeIds = useMemo(
		() => listActiveWorkspaceIds(statuses, openWorkspaceId),
		[statuses, openWorkspaceId],
	);
	const reportedKeyRef = useRef<string | null>(null);
	useEffect(() => {
		const key = [...activeIds].sort().join("\n");
		if (reportedKeyRef.current === key) return;
		reportedKeyRef.current = key;
		onChange(activeIds);
	}, [activeIds, onChange]);
	return null;
}
