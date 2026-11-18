import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@superset/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { useState } from "react";
import type { IconType } from "react-icons";
import { HiCheck, HiChevronDown } from "react-icons/hi2";
import {
	LuCircle,
	LuCircleCheck,
	LuCircleDot,
	LuCircleX,
} from "react-icons/lu";
import {
	STATUS_FILTER_VALUES,
	type StatusFilterValue,
} from "../../../../../../utils/statusFilter";
import { AllIssuesIcon } from "../../../shared/icons/AllIssuesIcon";
import { BacklogIcon } from "../../../shared/icons/BacklogIcon";

interface StatusFilterProps {
	value: StatusFilterValue[];
	onChange: (value: StatusFilterValue[]) => void;
}

const ICONS: Record<StatusFilterValue, IconType> = {
	backlog: BacklogIcon,
	unstarted: LuCircle,
	started: LuCircleDot,
	completed: LuCircleCheck,
	canceled: LuCircleX,
};

export function StatusFilter({ value, onChange }: StatusFilterProps) {
	const { t } = useLingui();
	const [open, setOpen] = useState(false);
	const labels: Record<StatusFilterValue, string> = {
		backlog: t({ message: "Backlog" }),
		unstarted: t({ message: "Todo" }),
		started: t({ message: "In progress" }),
		completed: t({ message: "Done" }),
		canceled: t({ message: "Canceled" }),
	};
	const allLabel = t({ message: "All tasks" });

	const [onlyStatus] = value;
	const TriggerIcon =
		value.length === 1 && onlyStatus ? ICONS[onlyStatus] : AllIssuesIcon;
	const triggerLabel =
		value.length === 0
			? allLabel
			: value.length === 1 && onlyStatus
				? labels[onlyStatus]
				: t({
						message: plural(value.length, {
							one: "# status",
							other: "# statuses",
						}),
					});
	const title = value.map((status) => labels[status]).join(", ") || allLabel;

	const toggle = (status: StatusFilterValue) =>
		onChange(
			STATUS_FILTER_VALUES.filter((candidate) =>
				candidate === status
					? !value.includes(candidate)
					: value.includes(candidate),
			),
		);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					title={title}
					aria-label={t({ message: `Status: ${title}` })}
					className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
				>
					<TriggerIcon className="size-3.5" />
					<span className="text-sm hidden @4xl:inline">{triggerLabel}</span>
					<HiChevronDown className="size-3" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-44 p-0">
				<Command>
					<CommandList>
						<CommandGroup>
							<CommandItem onSelect={() => onChange([])}>
								<AllIssuesIcon className="size-3.5 shrink-0" />
								<span className="text-sm">{allLabel}</span>
								{value.length === 0 && <HiCheck className="ml-auto size-3.5" />}
							</CommandItem>
							{STATUS_FILTER_VALUES.map((status) => {
								const Icon = ICONS[status];
								return (
									<CommandItem key={status} onSelect={() => toggle(status)}>
										<Icon className="size-3.5 shrink-0" />
										<span className="text-sm">{labels[status]}</span>
										{value.includes(status) && (
											<HiCheck className="ml-auto size-3.5" />
										)}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
