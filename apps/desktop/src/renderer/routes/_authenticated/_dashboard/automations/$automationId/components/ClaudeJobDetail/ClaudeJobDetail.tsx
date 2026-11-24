import { Trans, useLingui } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { Switch } from "@superset/ui/switch";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LuArrowUpRight, LuEllipsis, LuPlay, LuTrash2 } from "react-icons/lu";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { ClaudeJobForm } from "../../../components/ClaudeJobForm";
import { useClaudeJobActions } from "../../../hooks/useClaudeJobActions";
import {
	type ClaudeJobDraft,
	canSaveDraft,
	draftFromJob,
	saveInputFromDraft,
} from "../../../utils/claudeJobDraft";
import { AutomationBreadcrumbBar } from "../AutomationBreadcrumbBar";
import { ClaudeJobRuns } from "./components/ClaudeJobRuns";

const STATUS_REFRESH_MS = 15_000;

/** A Claude Jobs job, on the automation page of a free plan. */
export function ClaudeJobDetail({ jobId }: { jobId: string }) {
	const { t } = useLingui();
	const navigate = useNavigate();
	const actions = useClaudeJobActions();
	const statusQuery = electronTrpc.claudeJobs.status.useQuery(undefined, {
		refetchInterval: STATUS_REFRESH_MS,
	});
	const [edits, setEdits] = useState<ClaudeJobDraft | null>(null);
	// Remounts the form on discard, so fields with their own text state reset.
	const [formKey, setFormKey] = useState(0);

	const job =
		statusQuery.data?.state === "ready"
			? statusQuery.data.jobs.find((candidate) => candidate.id === jobId)
			: undefined;

	if (!job) {
		if (statusQuery.isPending) return null;
		return (
			<div className="flex h-full w-full flex-col overflow-hidden">
				<AutomationBreadcrumbBar />
				<div className="flex flex-1 cursor-text select-text items-center justify-center text-sm text-muted-foreground">
					{statusQuery.isError ? (
						<Trans>
							Couldn't load automation: {errorMessage(statusQuery.error)}
						</Trans>
					) : (
						<Trans>Automation not found.</Trans>
					)}
				</div>
			</div>
		);
	}

	const saved = draftFromJob(job);
	const draft = edits ?? saved;
	const dirty =
		edits !== null && JSON.stringify(edits) !== JSON.stringify(saved);
	const discard = () => {
		setEdits(null);
		setFormKey((key) => key + 1);
	};

	return (
		<div className="flex h-full w-full flex-1 flex-col overflow-hidden">
			<AutomationBreadcrumbBar name={job.name}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={t({ message: "More actions" })}
						>
							<LuEllipsis className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={actions.openApp}>
							<LuArrowUpRight className="size-4" />
							<Trans>Open Claude Jobs</Trans>
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onSelect={() =>
								actions.confirmDelete(job, {
									onDeleted: () => navigate({ to: "/automations" }),
								})
							}
						>
							<LuTrash2 className="size-4" />
							<Trans>Delete permanently</Trans>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<div className="mx-1 h-4 w-px bg-border" />
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-1.5 px-3"
					onClick={() => actions.runNow(job)}
					disabled={actions.startingId === job.id}
				>
					<LuPlay className="size-4" />
					<span>
						<Trans>Run now</Trans>
					</span>
				</Button>
			</AutomationBreadcrumbBar>

			<div className="flex-1 overflow-y-auto px-12 py-8">
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
					<div className="flex min-h-7 items-center gap-2 text-sm">
						<Switch
							checked={job.enabled}
							onCheckedChange={(enabled) => actions.setEnabled(job, enabled)}
							aria-label={
								job.enabled
									? t({ message: "Pause automation" })
									: t({ message: "Resume automation" })
							}
						/>
						<span className="text-muted-foreground">
							{job.enabled ? <Trans>Active</Trans> : <Trans>Paused</Trans>}
						</span>
						{dirty && (
							<div className="ml-auto flex items-center gap-1.5">
								<Button
									variant="ghost"
									size="sm"
									className="h-7 text-[13px]"
									onClick={discard}
									disabled={actions.isSaving}
								>
									<Trans>Discard</Trans>
								</Button>
								<Button
									size="sm"
									className="h-7 text-[13px]"
									onClick={() =>
										actions.save(
											{ ...saveInputFromDraft(draft), id: job.id },
											() => setEdits(null),
										)
									}
									disabled={actions.isSaving || !canSaveDraft(draft)}
								>
									{actions.isSaving ? (
										<Trans>Saving...</Trans>
									) : (
										<Trans>Save</Trans>
									)}
								</Button>
							</div>
						)}
					</div>

					<ClaudeJobForm
						key={formKey}
						value={draft}
						onChange={setEdits}
						job={job}
						disabled={actions.isSaving}
					/>

					<ClaudeJobRuns runs={job.recent} />
				</div>
			</div>
		</div>
	);
}
