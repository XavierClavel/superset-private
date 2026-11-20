import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { i18n } from "@superset/i18n";
import {
	formatCurrency,
	formatDateTime,
	formatElapsed,
} from "@superset/i18n/format";
import { Button } from "@superset/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@superset/ui/collapsible";
import { cn } from "@superset/ui/utils";
import type {
	ClaudeJobRun,
	ClaudeJobTrigger,
} from "lib/trpc/routers/claude-jobs/types";
import { LuChevronRight, LuMessageSquare } from "react-icons/lu";
import { MarkdownRenderer } from "renderer/components/MarkdownRenderer";
import { useOpenClaudeJobRun } from "renderer/routes/_authenticated/_dashboard/hooks/useOpenClaudeJobRun";
import { CLAUDE_JOB_RUN_STATUS_META } from "../../../../../../../utils/claudeJobRunStatus";

const TRIGGER_LABELS: Record<ClaudeJobTrigger, MessageDescriptor> = {
	schedule: msg({ message: "Schedule" }),
	manual: msg({ message: "Manual" }),
	"catch-up": msg({ message: "Catch-up" }),
	"pull-request": msg({ message: "Pull request" }),
};

export function ClaudeJobRunItem({ run }: { run: ClaudeJobRun }) {
	const status = CLAUDE_JOB_RUN_STATUS_META[run.status];
	const openRun = useOpenClaudeJobRun();
	const sessionId = run.status === "running" ? null : run.session_id;
	const startedAt = new Date(run.started_at);
	const details =
		run.status === "running" ? (run.progress?.text ?? null) : run.error;

	return (
		<Collapsible>
			<CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent/50">
				<LuChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
				<span
					className={cn(
						"inline-block size-1.5 shrink-0 rounded-full",
						status.dot,
					)}
				/>
				<span className="text-foreground">{i18n._(status.label)}</span>
				<span>{i18n._(TRIGGER_LABELS[run.trigger])}</span>
				<span className="ml-auto">{formatDateTime(startedAt)}</span>
				{run.ended_at && (
					<span>{formatElapsed(startedAt, new Date(run.ended_at))}</span>
				)}
				{run.cost_usd !== null && <span>{formatCurrency(run.cost_usd)}</span>}
			</CollapsibleTrigger>
			<CollapsibleContent className="cursor-text select-text border-t border-border px-4 py-3 text-sm">
				{sessionId && (
					<Button
						variant="outline"
						size="sm"
						className="float-right ml-3 h-7 gap-1.5"
						onClick={() => openRun.mutate(sessionId)}
						disabled={openRun.isPending}
					>
						<LuMessageSquare className="size-3.5" />
						<Trans>Open as a chat</Trans>
					</Button>
				)}
				{details && (
					<p className="whitespace-pre-wrap text-muted-foreground">{details}</p>
				)}
				{run.result && (
					<MarkdownRenderer content={run.result} allowHtml={false} />
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}
