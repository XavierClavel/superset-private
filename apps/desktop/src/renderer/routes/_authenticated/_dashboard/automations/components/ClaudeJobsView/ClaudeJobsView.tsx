import { Trans } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import { Button } from "@superset/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@superset/ui/empty";
import { Skeleton } from "@superset/ui/skeleton";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@superset/ui/table";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LuCalendarClock, LuRotateCw, LuTriangleAlert } from "react-icons/lu";
import { useCreateAgentSession } from "renderer/hooks/useCreateAgentSession";
import { useNow } from "renderer/hooks/useNow";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { DATA_TABLE_HEAD_CELL } from "renderer/routes/_authenticated/_dashboard/components/DataTableHeader";
import { FeatureHeader } from "renderer/routes/_authenticated/_dashboard/components/FeatureHeader";
import { PageHeader } from "renderer/routes/_authenticated/_dashboard/components/PageHeader";
import { useClaudeJobActions } from "../../hooks/useClaudeJobActions";
import { ClaudeJobRow } from "./components/ClaudeJobRow";
import { ClaudeJobsUnavailable } from "./components/ClaudeJobsUnavailable";
import { NewClaudeJobDialog } from "./components/NewClaudeJobDialog";
import { CLAUDE_JOBS_AGENT_PROMPT, CLAUDE_JOBS_URL } from "./constants";

const STATUS_REFRESH_MS = 15_000;

/** The Automations page of a free plan: the jobs of Claude Jobs on this Mac. */
export function ClaudeJobsView() {
	const now = useNow(30_000);
	const statusQuery = electronTrpc.claudeJobs.status.useQuery(undefined, {
		refetchInterval: STATUS_REFRESH_MS,
	});
	const actions = useClaudeJobActions();
	const status = statusQuery.data;
	const navigate = useNavigate();
	const [newJobOpen, setNewJobOpen] = useState(false);
	const { createSession, isPending: creatingWithAgent } =
		useCreateAgentSession();

	const content = (() => {
		if (statusQuery.isPending) {
			return (
				<div className="space-y-2">
					{["a", "b", "c", "d"].map((key) => (
						<Skeleton key={key} className="h-10 w-full" />
					))}
				</div>
			);
		}
		if (statusQuery.isError) {
			return (
				<Empty className="rounded-xl border border-border py-16">
					<EmptyHeader>
						<EmptyMedia
							variant="icon"
							className="size-14 [&_svg:not([class*='size-'])]:size-7"
						>
							<LuTriangleAlert />
						</EmptyMedia>
						<EmptyTitle>
							<Trans>Couldn't load automations</Trans>
						</EmptyTitle>
						<EmptyDescription className="select-text cursor-text">
							{errorMessage(statusQuery.error)}
						</EmptyDescription>
					</EmptyHeader>
					<Button
						variant="outline"
						size="sm"
						onClick={() => void statusQuery.refetch()}
					>
						<LuRotateCw className="size-4" />
						<span>
							<Trans>Try again</Trans>
						</span>
					</Button>
				</Empty>
			);
		}
		if (status?.state === "missing") return <ClaudeJobsUnavailable />;
		if (status?.state === "outdated") {
			return <ClaudeJobsUnavailable outdatedVersion={status.version} />;
		}
		const jobs = status?.jobs ?? [];
		if (jobs.length === 0) {
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
							<Trans>No automations yet</Trans>
						</EmptyTitle>
						<EmptyDescription>
							<Trans>Create one here, or in Claude Jobs.</Trans>
						</EmptyDescription>
					</EmptyHeader>
					<Button size="sm" onClick={() => setNewJobOpen(true)}>
						<Trans>New automation</Trans>
					</Button>
				</Empty>
			);
		}
		return (
			<div className="rounded-xl border border-border">
				<Table className="table-fixed">
					<TableHeader className="[&_tr]:border-b-0 shadow-[inset_0_-1px_0_0_var(--color-border)]">
						<TableRow className="hover:bg-transparent">
							<TableHead className={cn(DATA_TABLE_HEAD_CELL, "pl-4")}>
								<Trans>Name</Trans>
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEAD_CELL, "w-[26%]")}>
								<Trans>Schedule</Trans>
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEAD_CELL, "w-[14%]")}>
								<Trans>Status</Trans>
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEAD_CELL, "w-[16%]")}>
								<Trans>Last run</Trans>
							</TableHead>
							<TableHead className="w-20" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{jobs.map((job) => (
							<ClaudeJobRow
								key={job.id}
								job={job}
								now={now}
								isStarting={actions.startingId === job.id}
								onOpen={() =>
									navigate({
										to: "/automations/$automationId",
										params: { automationId: job.id },
									})
								}
								onRunNow={() => actions.runNow(job)}
								onToggleEnabled={() => actions.setEnabled(job, !job.enabled)}
								onDelete={() => actions.confirmDelete(job)}
							/>
						))}
					</TableBody>
				</Table>
			</div>
		);
	})();

	return (
		<div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
			<PageHeader />
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 pt-4 pb-12">
					<FeatureHeader
						title={<Trans>Automations</Trans>}
						docsUrl={CLAUDE_JOBS_URL}
						onCreate={() => void createSession(CLAUDE_JOBS_AGENT_PROMPT)}
						isCreating={creatingWithAgent}
						showCreate={status?.state === "ready"}
						createDescription={<Trans>Describe the work to your agent</Trans>}
						primaryAction={{
							label: <Trans>New automation</Trans>,
							onSelect: () => setNewJobOpen(true),
							disabled: false,
						}}
					/>
					<div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
						<Trans>Runs on this Mac with Claude Jobs.</Trans>
						{status?.state === "ready" && (
							<Button
								variant="link"
								size="sm"
								className="h-auto p-0"
								onClick={actions.openApp}
							>
								<Trans>Open Claude Jobs</Trans>
							</Button>
						)}
					</div>
					<div className="mt-5">{content}</div>
				</div>
			</div>
			<NewClaudeJobDialog open={newJobOpen} onOpenChange={setNewJobOpen} />
		</div>
	);
}
