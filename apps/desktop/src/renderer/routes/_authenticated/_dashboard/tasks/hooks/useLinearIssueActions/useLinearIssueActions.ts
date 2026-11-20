import { useLingui } from "@lingui/react/macro";
import type { TaskPriority } from "@superset/db/enums";
import { toast } from "@superset/ui/sonner";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useIsDarkTheme } from "renderer/assets/app-icons/preset-icons";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useOpenNewWorkspace } from "renderer/hooks/useOpenNewWorkspace";
import { usePlanBackend } from "renderer/hooks/usePlanBackend";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";
import {
	linkedContextSeed,
	linkedIssueChip,
} from "renderer/routes/_authenticated/components/AgentComposer/utils/linkedContextChips";
import { deriveBranchName } from "renderer/routes/_authenticated/utils/deriveBranchName";
import { linkedIssueFromLinear } from "renderer/routes/_authenticated/utils/linkedIssueFromLinear";
import { useNewWorkspaceDraftStore } from "renderer/stores/new-workspace-draft";
import type { LinearIssue } from "../../utils/linearIssueTypes";

export interface LinearIssueChanges {
	stateId?: string;
	priority?: TaskPriority;
	assigneeId?: string | null;
}

export function useLinearIssueActions() {
	const isDark = useIsDarkTheme();
	const { t } = useLingui();
	const navigate = useNavigate();
	const organizationId = useActiveOrganizationId();
	const backend = usePlanBackend();
	const utils = cloudTrpc.useUtils();
	const localUtils = electronTrpc.useUtils();
	const openNewWorkspace = useOpenNewWorkspace();

	const cloudUpdateMutation =
		cloudTrpc.integration.linear.updateIssue.useMutation({
			onSuccess: (issue) => {
				if (!organizationId) return;
				utils.integration.linear.issue.setData(
					{ organizationId, issueId: issue.id },
					issue,
				);
				utils.integration.linear.issue.setData(
					{ organizationId, issueId: issue.identifier },
					issue,
				);
				void utils.integration.linear.issues.invalidate();
			},
			onError: (error) => toast.error(error.message),
		});

	const localUpdateMutation = electronTrpc.linear.updateIssue.useMutation({
		onSuccess: (issue) => {
			localUtils.linear.issue.setData({ issueId: issue.id }, issue);
			localUtils.linear.issue.setData({ issueId: issue.identifier }, issue);
			void localUtils.linear.issues.invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const importMutation = cloudTrpc.task.importFromLinear.useMutation({
		onSuccess: ({ task, imported }) => {
			void utils.task.listPage.invalidate();
			if (!task) return;
			toast.success(
				imported
					? t({ message: "Imported to tasks" })
					: t({ message: "Already in tasks" }),
				{
					action: {
						label: t({ message: "Open" }),
						onClick: () =>
							navigate({ to: "/tasks/$taskId", params: { taskId: task.id } }),
					},
				},
			);
		},
		onError: (error) => toast.error(error.message),
	});

	const addToWorkspace = useCallback(
		(issue: LinearIssue) => {
			const linkedIssue = linkedIssueFromLinear(issue);
			const store = useNewWorkspaceDraftStore.getState();
			store.resetDraft();
			store.updateDraft({
				promptDraft: linkedContextSeed([linkedIssueChip(linkedIssue, isDark)]),
				branchName: deriveBranchName(linkedIssue),
				branchNameEdited: true,
				branchNameFromProvider: !!linkedIssue.branch,
				workspaceName: issue.title,
				workspaceNameEdited: true,
			});
			openNewWorkspace();
		},
		[openNewWorkspace, isDark],
	);

	const update = useCallback(
		(issue: LinearIssue, changes: LinearIssueChanges) => {
			if (backend === "local") {
				localUpdateMutation.mutate({ issueId: issue.id, ...changes });
				return;
			}
			if (!organizationId) return;
			cloudUpdateMutation.mutate({
				organizationId,
				issueId: issue.id,
				...changes,
			});
		},
		[backend, organizationId, cloudUpdateMutation, localUpdateMutation],
	);

	const importToTasks = useCallback(
		(issue: LinearIssue) => importMutation.mutate({ issueId: issue.id }),
		[importMutation],
	);

	return {
		addToWorkspace,
		update,
		canImportToTasks: backend === "cloud",
		importToTasks,
		isImporting: importMutation.isPending,
	};
}
