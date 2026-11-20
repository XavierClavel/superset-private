import { Trans, useLingui } from "@lingui/react/macro";
import { Field, FieldDescription, FieldLabel } from "@superset/ui/field";
import { Input } from "@superset/ui/input";
import { Textarea } from "@superset/ui/textarea";
import type { ClaudeJob } from "lib/trpc/routers/claude-jobs/types";
import type { ClaudeJobDraft } from "../../utils/claudeJobDraft";
import { describeClaudeJobSchedule } from "../../utils/claudeJobSchedule";
import { ClaudeJobFolderSelect } from "./components/ClaudeJobFolderSelect";
import { ClaudeJobScheduleFields } from "./components/ClaudeJobScheduleFields";

interface ClaudeJobFormProps {
	value: ClaudeJobDraft;
	onChange: (next: ClaudeJobDraft) => void;
	/** The job being edited: a pull-request trigger replaces its schedule. */
	job?: ClaudeJob;
	disabled?: boolean;
}

export function ClaudeJobForm({
	value,
	onChange,
	job,
	disabled,
}: ClaudeJobFormProps) {
	const { t } = useLingui();
	const edit = (patch: Partial<ClaudeJobDraft>) =>
		onChange({ ...value, ...patch });

	return (
		<div className="flex flex-col gap-5">
			<Field>
				<FieldLabel htmlFor="claude-job-name">
					<Trans>Name</Trans>
				</FieldLabel>
				<Input
					id="claude-job-name"
					value={value.name}
					onChange={(event) => edit({ name: event.target.value })}
					placeholder={t({ message: "Automation title" })}
					disabled={disabled}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="claude-job-prompt">
					<Trans>Prompt</Trans>
				</FieldLabel>
				<Textarea
					id="claude-job-prompt"
					value={value.prompt}
					onChange={(event) => edit({ prompt: event.target.value })}
					placeholder="/my-skill"
					rows={6}
					className="font-mono text-[13px]"
					disabled={disabled}
				/>
			</Field>

			<Field>
				<FieldLabel>
					<Trans>Schedule</Trans>
				</FieldLabel>
				{job?.event ? (
					<FieldDescription>
						{describeClaudeJobSchedule(job)}.{" "}
						<Trans>Change the trigger in Claude Jobs.</Trans>
					</FieldDescription>
				) : (
					<ClaudeJobScheduleFields
						value={value}
						onChange={edit}
						disabled={disabled}
					/>
				)}
			</Field>

			<Field>
				<FieldLabel>
					<Trans>Folder</Trans>
				</FieldLabel>
				<ClaudeJobFolderSelect
					value={value.cwd}
					onChange={(cwd) => edit({ cwd })}
					disabled={disabled}
				/>
			</Field>
		</div>
	);
}
