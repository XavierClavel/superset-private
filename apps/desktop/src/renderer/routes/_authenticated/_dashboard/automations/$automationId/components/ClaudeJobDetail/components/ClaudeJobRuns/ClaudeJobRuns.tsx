import { Trans } from "@lingui/react/macro";
import type { ClaudeJobRun } from "lib/trpc/routers/claude-jobs/types";
import { ClaudeJobRunItem } from "./components/ClaudeJobRunItem";

export function ClaudeJobRuns({ runs }: { runs: ClaudeJobRun[] }) {
	return (
		<section className="flex flex-col gap-2">
			<h2 className="text-sm font-medium">
				<Trans>History</Trans>
			</h2>
			{runs.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<Trans>No runs yet</Trans>
				</p>
			) : (
				<div className="divide-y divide-border rounded-lg border border-border">
					{runs.map((run) => (
						<ClaudeJobRunItem key={run.id} run={run} />
					))}
				</div>
			)}
		</section>
	);
}
