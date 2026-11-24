import { Trans } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@superset/ui/empty";
import { LuArrowUpRight, LuCalendarClock } from "react-icons/lu";
import { CLAUDE_JOBS_RELEASES_URL } from "../../constants";

interface ClaudeJobsUnavailableProps {
	/** The installed version when it is too old, none when it is not installed. */
	outdatedVersion?: string;
}

export function ClaudeJobsUnavailable({
	outdatedVersion,
}: ClaudeJobsUnavailableProps) {
	return (
		<Empty className="rounded-xl border border-border py-16">
			<EmptyHeader>
				<EmptyMedia
					variant="icon"
					className="size-14 [&_svg:not([class*='size-'])]:size-7"
				>
					<LuCalendarClock />
				</EmptyMedia>
				<EmptyTitle>
					{outdatedVersion ? (
						<Trans>Update Claude Jobs</Trans>
					) : (
						<Trans>Install Claude Jobs</Trans>
					)}
				</EmptyTitle>
				<EmptyDescription>
					{outdatedVersion ? (
						<Trans>
							Claude Jobs {outdatedVersion} is too old for Paradev. Open it to
							update it, or install the latest version.
						</Trans>
					) : (
						<Trans>
							On a free plan, automations run on this Mac with Claude Jobs, an
							app that runs Claude Code on a schedule.
						</Trans>
					)}
				</EmptyDescription>
			</EmptyHeader>
			<Button variant="outline" size="sm" asChild>
				<a href={CLAUDE_JOBS_RELEASES_URL} target="_blank" rel="noreferrer">
					<Trans>Download Claude Jobs</Trans>
					<LuArrowUpRight className="size-4" />
				</a>
			</Button>
		</Empty>
	);
}
