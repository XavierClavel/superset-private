import { useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { LuHistory } from "react-icons/lu";

interface DashboardSidebarRecentViewToggleProps {
	isRecentView: boolean;
	onRecentViewChange: (next: boolean) => void;
}

export function DashboardSidebarRecentViewToggle({
	isRecentView,
	onRecentViewChange,
}: DashboardSidebarRecentViewToggleProps) {
	const { t } = useLingui();
	const label = isRecentView
		? t({ message: "Group by project" })
		: t({ message: "Show recent workspaces" });

	return (
		<Tooltip delayDuration={700}>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					aria-pressed={isRecentView}
					onClick={(event) => {
						event.stopPropagation();
						onRecentViewChange(!isRecentView);
					}}
					onKeyDown={(event) => event.stopPropagation()}
					className={cn(
						"flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-fill-hover hover:text-foreground",
						isRecentView
							? "bg-fill-selected text-foreground"
							: "text-muted-foreground",
					)}
				>
					<LuHistory className="size-3.5" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}
