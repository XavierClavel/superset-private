import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { Bot } from "lucide-react";
import { useSidebarWorkspaceStatus } from "../../../../../../providers/DashboardSidebarWorkspaceStatusProvider";

export function DashboardSidebarBackgroundWorkBadge({
	workspaceId,
}: {
	workspaceId: string;
}) {
	const { t } = useLingui();
	const { backgroundWork: work } = useSidebarWorkspaceStatus(workspaceId);

	const backgroundWork = work.length;
	if (backgroundWork === 0) return null;
	const descriptions = work.filter(Boolean);
	const label = t({
		message: plural(backgroundWork, {
			one: "# background task running",
			other: "# background tasks running",
		}),
	});
	return (
		<Tooltip delayDuration={500}>
			<TooltipTrigger asChild>
				<span className="flex h-5 shrink-0 items-center gap-0.5 font-mono text-[10px] tabular-nums text-emerald-500/90">
					<Bot
						aria-hidden="true"
						className="size-3 motion-safe:animate-pulse"
					/>
					<span aria-hidden="true">{backgroundWork}</span>
					<span className="sr-only">{label}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent side="right">
				<p className="text-foreground">{label}</p>
				{descriptions.length > 0 && (
					<ul className="mt-1 space-y-0.5">
						{descriptions.map((description, index) => (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: descriptions can repeat
								key={index}
								className="truncate"
							>
								{description}
							</li>
						))}
					</ul>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
