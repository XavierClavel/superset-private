import { useLingui } from "@lingui/react/macro";
import { toast } from "@superset/ui/sonner";
import { useDashboardSidebarLabels } from "../../providers/DashboardSidebarLabelsProvider";

export function useWorkspaceLabelToggle(workspaceId: string) {
	const { t } = useLingui();
	const { labels, labelsByWorkspaceId, setWorkspaceLabels } =
		useDashboardSidebarLabels();
	const assignedIds = (labelsByWorkspaceId.get(workspaceId) ?? []).map(
		(label) => label.id,
	);

	const toggle = (labelId: string, checked: boolean) => {
		const nextIds = checked
			? [...assignedIds, labelId]
			: assignedIds.filter((id) => id !== labelId);
		setWorkspaceLabels(workspaceId, nextIds).catch(() => {
			toast.error(t({ message: "Could not update the workspace labels" }));
		});
	};

	return { labels, assignedIds, toggle };
}
