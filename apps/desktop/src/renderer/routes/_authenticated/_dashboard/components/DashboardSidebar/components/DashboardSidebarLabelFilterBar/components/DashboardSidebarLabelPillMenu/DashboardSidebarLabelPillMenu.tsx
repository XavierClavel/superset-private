import { Trans, useLingui } from "@lingui/react/macro";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@superset/ui/alert-dialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import { useRunAfterMenuClose } from "@superset/ui/hooks/use-run-after-menu-close";
import { toast } from "@superset/ui/sonner";
import { type ReactNode, useState } from "react";
import { ColorSelector } from "renderer/components/ColorSelector";
import type { WorkspaceLabel } from "renderer/hooks/workspace-labels/useWorkspaceLabels";
import { WorkspaceLabelDialog } from "renderer/routes/_authenticated/components/WorkspaceLabelDialog";
import { toPastelColor } from "renderer/routes/_authenticated/components/WorkspaceLabelPill";
import { useDashboardSidebarLabels } from "../../../../providers/DashboardSidebarLabelsProvider";

interface DashboardSidebarLabelPillMenuProps {
	label: WorkspaceLabel;
	children: ReactNode;
}

export function DashboardSidebarLabelPillMenu({
	label,
	children,
}: DashboardSidebarLabelPillMenuProps) {
	const { t } = useLingui();
	const { updateLabel, deleteLabel } = useDashboardSidebarLabels();
	const [isRenameOpen, setIsRenameOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const { runAfterClose, onCloseAutoFocus } = useRunAfterMenuClose();

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
				<ContextMenuContent onCloseAutoFocus={onCloseAutoFocus}>
					<ContextMenuItem
						onSelect={() => runAfterClose(() => setIsRenameOpen(true))}
					>
						<Trans>Rename…</Trans>
					</ContextMenuItem>
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<Trans>Color</Trans>
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ColorSelector
								variant="menu"
								toSwatchColor={toPastelColor}
								selectedColor={label.color}
								onSelectColor={(color) => {
									updateLabel(label.id, { color }).catch(() => {
										toast.error(
											t({ message: "Could not change the label color" }),
										);
									});
								}}
							/>
						</ContextMenuSubContent>
					</ContextMenuSub>
					<ContextMenuSeparator />
					<ContextMenuItem
						variant="destructive"
						onSelect={() => runAfterClose(() => setIsDeleteOpen(true))}
					>
						<Trans>Delete</Trans>
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<WorkspaceLabelDialog
				open={isRenameOpen}
				onOpenChange={setIsRenameOpen}
				mode="rename"
				initial={{ name: label.name, color: label.color }}
				onSubmit={(values) => updateLabel(label.id, values)}
			/>

			<AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<AlertDialogContent className="max-w-[340px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="font-medium">
							<Trans>Delete label "{label.name}"?</Trans>
						</AlertDialogTitle>
						<AlertDialogDescription>
							<Trans>
								The label is removed from every workspace. The workspaces
								themselves are not affected.
							</Trans>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							<Trans>Cancel</Trans>
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								deleteLabel(label.id).catch(() => {
									toast.error(t({ message: "Could not delete the label" }));
								});
							}}
						>
							<Trans>Delete</Trans>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
