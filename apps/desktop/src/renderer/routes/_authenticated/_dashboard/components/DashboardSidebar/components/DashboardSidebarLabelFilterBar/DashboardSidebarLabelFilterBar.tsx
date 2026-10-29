import { Trans } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import { WorkspaceLabelPill } from "renderer/routes/_authenticated/components/WorkspaceLabelPill";
import { useDashboardSidebarLabels } from "../../providers/DashboardSidebarLabelsProvider";
import { DashboardSidebarChipStrip } from "../DashboardSidebarChipStrip";
import { DashboardSidebarLabelPillMenu } from "./components/DashboardSidebarLabelPillMenu";

export function DashboardSidebarLabelFilterBar() {
	const { labels, activeFilterLabel, setActiveFilterLabelId } =
		useDashboardSidebarLabels();

	if (labels.length === 0) return null;

	return (
		<DashboardSidebarChipStrip className="px-3 py-1.5">
			<button
				type="button"
				aria-pressed={activeFilterLabel === null}
				onClick={() => setActiveFilterLabelId(null)}
				className={cn(
					"inline-flex h-5 shrink-0 items-center rounded-full border border-border px-2 text-[11px] font-medium leading-none text-muted-foreground hover:bg-fill-hover",
					activeFilterLabel === null &&
						"bg-fill-selected text-foreground ring-2 ring-foreground ring-offset-1 ring-offset-background",
				)}
			>
				<Trans>All</Trans>
			</button>
			{labels.map((label) => {
				const isActive = activeFilterLabel?.id === label.id;
				return (
					<DashboardSidebarLabelPillMenu key={label.id} label={label}>
						<WorkspaceLabelPill
							label={label}
							isActive={isActive}
							onClick={() => setActiveFilterLabelId(isActive ? null : label.id)}
						/>
					</DashboardSidebarLabelPillMenu>
				);
			})}
		</DashboardSidebarChipStrip>
	);
}
