import { Trans } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import type { MouseEvent } from "react";
import { NO_LABEL_FILTER_KEY } from "renderer/hooks/workspace-labels/useWorkspaceLabels";
import { WorkspaceLabelPill } from "renderer/routes/_authenticated/components/WorkspaceLabelPill";
import { useDashboardSidebarLabels } from "../../providers/DashboardSidebarLabelsProvider";
import { DashboardSidebarChipStrip } from "./components/DashboardSidebarChipStrip";
import { DashboardSidebarLabelPillMenu } from "./components/DashboardSidebarLabelPillMenu";

const TEXT_CHIP_CLASS_NAME =
	"inline-flex h-5 shrink-0 items-center rounded-full border border-border px-2 text-[11px] font-medium leading-none text-muted-foreground hover:bg-fill-hover";
const ACTIVE_TEXT_CHIP_CLASS_NAME =
	"bg-fill-selected text-foreground ring-2 ring-foreground ring-offset-1 ring-offset-background";

function openContextMenuAt(event: MouseEvent<HTMLElement>) {
	event.currentTarget.dispatchEvent(
		new globalThis.MouseEvent("contextmenu", {
			bubbles: true,
			cancelable: true,
			clientX: event.clientX,
			clientY: event.clientY,
		}),
	);
}

export function DashboardSidebarLabelFilterBar() {
	const {
		labels,
		activeFilterKeys,
		selectOnlyFilterKey,
		toggleFilterKey,
		clearLabelFilter,
	} = useDashboardSidebarLabels();

	if (labels.length === 0) return null;

	const filterKeyHandlers = (key: string, hasMenu: boolean) => ({
		onClick: (event: MouseEvent<HTMLButtonElement>) => {
			if (event.metaKey && hasMenu) openContextMenuAt(event);
			else if (event.ctrlKey) toggleFilterKey(key);
			else selectOnlyFilterKey(key);
		},
		// macOS turns a Ctrl-click into a contextmenu event and fires no click.
		onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
			if (!event.ctrlKey || event.button !== 0) return;
			event.preventDefault();
			toggleFilterKey(key);
		},
	});

	const isNoLabelActive = activeFilterKeys?.has(NO_LABEL_FILTER_KEY) ?? false;

	return (
		<DashboardSidebarChipStrip className="px-3 py-1.5">
			<button
				type="button"
				aria-pressed={activeFilterKeys === null}
				onClick={clearLabelFilter}
				className={cn(
					TEXT_CHIP_CLASS_NAME,
					activeFilterKeys === null && ACTIVE_TEXT_CHIP_CLASS_NAME,
				)}
			>
				<Trans>All</Trans>
			</button>
			{labels.map((label) => (
				<DashboardSidebarLabelPillMenu key={label.id} label={label}>
					<WorkspaceLabelPill
						label={label}
						isActive={activeFilterKeys?.has(label.id) ?? false}
						{...filterKeyHandlers(label.id, true)}
					/>
				</DashboardSidebarLabelPillMenu>
			))}
			<button
				type="button"
				aria-pressed={isNoLabelActive}
				{...filterKeyHandlers(NO_LABEL_FILTER_KEY, false)}
				className={cn(
					TEXT_CHIP_CLASS_NAME,
					"border-dashed",
					isNoLabelActive && ACTIVE_TEXT_CHIP_CLASS_NAME,
				)}
			>
				<Trans>No label</Trans>
			</button>
		</DashboardSidebarChipStrip>
	);
}
