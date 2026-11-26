import { useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { LuActivity } from "react-icons/lu";

interface DashboardSidebarActiveViewToggleProps {
	isActiveView: boolean;
	onActiveViewChange: (next: boolean) => void;
}

export function DashboardSidebarActiveViewToggle({
	isActiveView,
	onActiveViewChange,
}: DashboardSidebarActiveViewToggleProps) {
	const { t } = useLingui();
	const label = isActiveView
		? t({ message: "Show all workspaces" })
		: t({ message: "Show active workspaces" });

	return (
		<Tooltip delayDuration={700}>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					aria-pressed={isActiveView}
					onClick={(event) => {
						event.stopPropagation();
						onActiveViewChange(!isActiveView);
					}}
					onKeyDown={(event) => event.stopPropagation()}
					className={cn(
						"flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-fill-hover hover:text-foreground",
						isActiveView
							? "bg-fill-selected text-foreground"
							: "text-muted-foreground",
					)}
				>
					<LuActivity className="size-3.5" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}
