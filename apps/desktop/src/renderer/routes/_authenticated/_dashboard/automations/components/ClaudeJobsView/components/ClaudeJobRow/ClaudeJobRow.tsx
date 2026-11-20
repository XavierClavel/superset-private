import { Trans, useLingui } from "@lingui/react/macro";
import { i18n } from "@superset/i18n";
import { useFormat } from "@superset/i18n/react";
import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { TableCell, TableRow } from "@superset/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import type { ClaudeJob } from "lib/trpc/routers/claude-jobs/types";
import {
	LuEllipsis,
	LuPause,
	LuPlay,
	LuRotateCw,
	LuTrash2,
} from "react-icons/lu";
import { CLAUDE_JOB_RUN_STATUS_META } from "../../../../utils/claudeJobRunStatus";
import { describeClaudeJobSchedule } from "../../../../utils/claudeJobSchedule";
import { compactAgo, compactUntil } from "../../../../utils/compactTime";

interface ClaudeJobRowProps {
	job: ClaudeJob;
	now: Date;
	isStarting: boolean;
	onRunNow: () => void;
	onToggleEnabled: () => void;
	onDelete: () => void;
}

export function ClaudeJobRow({
	job,
	now,
	isStarting,
	onRunNow,
	onToggleEnabled,
	onDelete,
}: ClaudeJobRowProps) {
	const { t } = useLingui();
	const { formatDateTime } = useFormat();
	const schedule = describeClaudeJobSchedule(job);
	const lastRun = job.recent[0];
	const lastRunMeta = lastRun
		? CLAUDE_JOB_RUN_STATUS_META[lastRun.status]
		: null;
	const lastRunAt = lastRun ? new Date(lastRun.started_at) : null;
	const nextRunAt = job.next_run ? new Date(job.next_run) : null;

	return (
		<TableRow className="group/row h-10 border-border/50 text-sm hover:bg-accent/50">
			<TableCell className="pl-4">
				<span
					className={cn(
						"block truncate font-medium",
						!job.enabled && "text-muted-foreground",
					)}
					title={job.name}
				>
					{job.name}
				</span>
			</TableCell>

			<TableCell
				className="truncate text-xs text-muted-foreground"
				title={schedule}
			>
				{schedule}
			</TableCell>

			<TableCell
				className="text-xs text-muted-foreground"
				title={
					job.enabled && nextRunAt
						? t({ message: `Next run ${formatDateTime(nextRunAt, undefined)}` })
						: undefined
				}
			>
				{job.enabled ? (
					<span className="truncate">
						<Trans>Active</Trans>
						{nextRunAt && (
							<span className="text-muted-foreground/60">
								{" · "}
								{compactUntil(nextRunAt.getTime(), now)}
							</span>
						)}
					</span>
				) : (
					<Trans>Paused</Trans>
				)}
			</TableCell>

			<TableCell className="text-xs text-muted-foreground">
				{lastRunMeta && lastRunAt ? (
					<span className="flex items-center gap-1.5">
						<span
							className={cn(
								"inline-block size-1.5 shrink-0 rounded-full",
								lastRunMeta.dot,
							)}
						/>
						{i18n._(lastRunMeta.label)}
						<span
							className="truncate text-muted-foreground/70"
							title={formatDateTime(lastRunAt, undefined)}
						>
							{compactAgo(lastRunAt.getTime(), now)}
						</span>
					</span>
				) : (
					<span>—</span>
				)}
			</TableCell>

			<TableCell className="pr-4">
				<span className="flex items-center justify-end gap-0.5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={isStarting}
								onClick={onRunNow}
								aria-label={t({ message: `Run ${job.name} now` })}
								className={cn(
									"opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
									isStarting && "opacity-100",
								)}
							>
								{isStarting ? (
									<LuRotateCw className="size-4 animate-spin" />
								) : (
									<LuPlay className="size-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<Trans>Run now</Trans>
						</TooltipContent>
					</Tooltip>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={t({ message: "Row actions" })}
								className="opacity-0 group-hover/row:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100"
							>
								<LuEllipsis className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onSelect={onToggleEnabled}>
								{job.enabled ? (
									<>
										<LuPause className="size-4" />
										<Trans>Pause</Trans>
									</>
								) : (
									<>
										<LuPlay className="size-4" />
										<Trans>Resume</Trans>
									</>
								)}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onSelect={onDelete}>
								<LuTrash2 className="size-4" />
								<Trans>Delete permanently</Trans>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</span>
			</TableCell>
		</TableRow>
	);
}
