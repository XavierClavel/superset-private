import { Trans } from "@lingui/react/macro";
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@superset/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { LuPlus, LuTag } from "react-icons/lu";
import { useWorkspaceLabels } from "renderer/hooks/workspace-labels/useWorkspaceLabels";
import { WorkspaceLabelDialog } from "renderer/routes/_authenticated/components/WorkspaceLabelDialog";
import {
	toPastelColor,
	WorkspaceLabelPill,
} from "renderer/routes/_authenticated/components/WorkspaceLabelPill";
import { FormPickerTrigger } from "../FormPickerTrigger";

interface LabelPickerPillProps {
	selectedLabelIds: string[];
	onChange: (labelIds: string[]) => void;
}

export function LabelPickerPill({
	selectedLabelIds,
	onChange,
}: LabelPickerPillProps) {
	const { labels, createLabel } = useWorkspaceLabels();
	const [open, setOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	const selectedLabels = labels.filter((label) =>
		selectedLabelIds.includes(label.id),
	);

	const toggle = (labelId: string) => {
		onChange(
			selectedLabelIds.includes(labelId)
				? selectedLabelIds.filter((id) => id !== labelId)
				: [...selectedLabelIds, labelId],
		);
	};

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<FormPickerTrigger className="max-w-[200px] gap-1.5">
						<LuTag className="size-4 shrink-0" />
						{selectedLabels.length === 0 ? (
							<span className="truncate">
								<Trans context="personal workspace labels">Labels</Trans>
							</span>
						) : (
							selectedLabels.map((label) => (
								<WorkspaceLabelPill key={label.id} label={label} size="xs" />
							))
						)}
					</FormPickerTrigger>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className="w-56 p-0"
					onWheel={(event) => event.stopPropagation()}
				>
					<Command>
						<CommandList className="max-h-[min(280px,var(--radix-popover-content-available-height))]">
							{labels.length > 0 && (
								<CommandGroup>
									{labels.map((label) => (
										<CommandItem
											key={label.id}
											value={label.name}
											onSelect={() => toggle(label.id)}
										>
											<span
												className="size-2 shrink-0 rounded-full"
												style={{ backgroundColor: toPastelColor(label.color) }}
											/>
											<span className="flex-1 truncate">{label.name}</span>
											{selectedLabelIds.includes(label.id) && (
												<HiCheck className="size-4 shrink-0" />
											)}
										</CommandItem>
									))}
								</CommandGroup>
							)}
							{labels.length > 0 && <CommandSeparator />}
							<CommandGroup>
								<CommandItem
									value="new-label"
									onSelect={() => {
										setOpen(false);
										setIsCreateOpen(true);
									}}
								>
									<LuPlus className="size-4 text-muted-foreground" />
									<Trans>New label…</Trans>
								</CommandItem>
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			<WorkspaceLabelDialog
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
				mode="create"
				onSubmit={async (values) => {
					const created = await createLabel(values);
					onChange([...selectedLabelIds, created.id]);
				}}
			/>
		</>
	);
}
