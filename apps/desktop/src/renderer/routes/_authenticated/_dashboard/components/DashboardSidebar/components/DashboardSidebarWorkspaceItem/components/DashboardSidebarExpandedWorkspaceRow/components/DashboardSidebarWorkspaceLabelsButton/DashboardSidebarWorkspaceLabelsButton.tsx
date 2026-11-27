import { Trans, useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { useRunAfterMenuClose } from "@superset/ui/hooks/use-run-after-menu-close";
import { type SyntheticEvent, useState } from "react";
import { LuPlus, LuTag } from "react-icons/lu";
import { WorkspaceLabelDialog } from "renderer/routes/_authenticated/components/WorkspaceLabelDialog";
import { toPastelColor } from "renderer/routes/_authenticated/components/WorkspaceLabelPill";
import { useCreateAndAssignWorkspaceLabel } from "../../../../../../hooks/useCreateAndAssignWorkspaceLabel";
import { useWorkspaceLabelToggle } from "../../../../../../hooks/useWorkspaceLabelToggle";

interface DashboardSidebarWorkspaceLabelsButtonProps {
	workspaceId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DashboardSidebarWorkspaceLabelsButton({
	workspaceId,
	open,
	onOpenChange,
}: DashboardSidebarWorkspaceLabelsButtonProps) {
	const { t } = useLingui();
	const { labels, assignedIds, toggle } = useWorkspaceLabelToggle(workspaceId);
	const handleCreateLabel = useCreateAndAssignWorkspaceLabel(workspaceId);
	const { runAfterClose, onCloseAutoFocus } = useRunAfterMenuClose();
	const [isNewLabelOpen, setIsNewLabelOpen] = useState(false);

	const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The menu and dialog render in portals, but React still bubbles their events to the row, which would open or select the workspace.
		<span
			className="contents"
			onClick={stopPropagation}
			onKeyDown={stopPropagation}
			onDoubleClick={stopPropagation}
		>
			{/* Not modal: a click on another workspace must open it, not only close the menu. */}
			<DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex items-center justify-center text-muted-foreground hover:text-foreground"
						aria-label={t({
							message: "Labels",
							context: "personal workspace labels",
						})}
					>
						<LuTag className="size-3.5" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" onCloseAutoFocus={onCloseAutoFocus}>
					{labels.map((label) => (
						<DropdownMenuCheckboxItem
							key={label.id}
							checked={assignedIds.includes(label.id)}
							onCheckedChange={(checked) => toggle(label.id, checked === true)}
							onSelect={(event) => event.preventDefault()}
						>
							<span
								className="size-2 shrink-0 rounded-full mr-2"
								style={{ backgroundColor: toPastelColor(label.color) }}
							/>
							{label.name}
						</DropdownMenuCheckboxItem>
					))}
					{labels.length > 0 && <DropdownMenuSeparator />}
					<DropdownMenuItem
						onSelect={() => runAfterClose(() => setIsNewLabelOpen(true))}
					>
						<LuPlus className="size-4 mr-2" />
						<Trans>New label…</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<WorkspaceLabelDialog
				open={isNewLabelOpen}
				onOpenChange={setIsNewLabelOpen}
				mode="create"
				onSubmit={handleCreateLabel}
			/>
		</span>
	);
}
