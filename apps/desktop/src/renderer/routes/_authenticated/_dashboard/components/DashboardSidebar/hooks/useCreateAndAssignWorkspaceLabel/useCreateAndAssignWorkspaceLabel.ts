import { useLingui } from "@lingui/react/macro";
import { toast } from "@superset/ui/sonner";
import type { WorkspaceLabelValues } from "renderer/routes/_authenticated/components/WorkspaceLabelDialog";
import { useDashboardSidebarLabels } from "../../providers/DashboardSidebarLabelsProvider";

export function useCreateAndAssignWorkspaceLabel(workspaceId: string) {
	const { t } = useLingui();
	const { createLabel, setWorkspaceLabels, labelsByWorkspaceId } =
		useDashboardSidebarLabels();

	return async (values: WorkspaceLabelValues) => {
		const created = await createLabel(values);
		const currentIds = (labelsByWorkspaceId.get(workspaceId) ?? []).map(
			(label) => label.id,
		);
		try {
			await setWorkspaceLabels(workspaceId, [...currentIds, created.id]);
		} catch {
			toast.error(t({ message: "Label created but could not be assigned" }));
		}
	};
}
