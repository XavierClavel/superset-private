import { Trans } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useClaudeJobActions } from "../../../../hooks/useClaudeJobActions";
import {
	canSaveDraft,
	NEW_CLAUDE_JOB_DRAFT,
	saveInputFromDraft,
} from "../../../../utils/claudeJobDraft";
import { ClaudeJobForm } from "../../../ClaudeJobForm";

interface NewClaudeJobDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NewClaudeJobDialog({
	open,
	onOpenChange,
}: NewClaudeJobDialogProps) {
	const navigate = useNavigate();
	const { save, isSaving } = useClaudeJobActions();
	const [draft, setDraft] = useState(NEW_CLAUDE_JOB_DRAFT);

	const create = () =>
		save(saveInputFromDraft(draft), (id) => {
			onOpenChange(false);
			setDraft(NEW_CLAUDE_JOB_DRAFT);
			navigate({
				to: "/automations/$automationId",
				params: { automationId: id },
			});
		});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>
						<Trans>New automation</Trans>
					</DialogTitle>
				</DialogHeader>
				<ClaudeJobForm value={draft} onChange={setDraft} disabled={isSaving} />
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={create} disabled={isSaving || !canSaveDraft(draft)}>
						{isSaving ? <Trans>Creating...</Trans> : <Trans>Create</Trans>}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
