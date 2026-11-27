import { formatTimer } from "@superset/i18n/format";
import { useNow } from "renderer/hooks/useNow";
import type { BackgroundWorkItem } from "../../../../../../../../providers/DashboardSidebarWorkspaceStatusProvider";

export function BackgroundWorkList({
	work,
}: {
	work: readonly BackgroundWorkItem[];
}) {
	const now = useNow().getTime();
	return (
		<ul className="mt-1 space-y-0.5">
			{work.map(({ description, startedAtMs }, index) => (
				<li
					// biome-ignore lint/suspicious/noArrayIndexKey: descriptions can repeat
					key={index}
					className="flex items-baseline gap-2"
				>
					<span className="min-w-0 truncate">{description}</span>
					<span className="ml-auto shrink-0 text-muted-foreground/70 tabular-nums">
						{formatTimer(startedAtMs, now)}
					</span>
				</li>
			))}
		</ul>
	);
}
