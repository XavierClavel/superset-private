import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import { toast } from "@superset/ui/sonner";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { useWorkspaceCreates } from "renderer/stores/workspace-creates";
import { CLAUDE_JOBS_WORKSPACE_TAG } from "../../utils/claudeJobsWorkspace";
import { openClaudeJobRun } from "../../utils/openClaudeJobRun";

/** Opens a finished run as a chat in the shared Automations workspace. */
export function useOpenClaudeJobRun() {
	const { t } = useLingui();
	const navigate = useNavigate();
	const { machineId, activeHostUrl } = useLocalHostService();
	const { submit } = useWorkspaceCreates();

	const createWorkspace = async () => {
		const { workspaceId, completed } = submit({
			hostId: machineId,
			snapshot: {
				id: crypto.randomUUID(),
				projectId: null,
				name: t({ message: "Automations" }),
				tags: [CLAUDE_JOBS_WORKSPACE_TAG],
			},
		});
		const outcome = await completed;
		if (!outcome.ok) throw new Error(outcome.error);
		return workspaceId;
	};

	return useMutation({
		mutationFn: async (harnessSessionId: string) => {
			if (!activeHostUrl) {
				throw new Error(t({ message: "Host service is not running" }));
			}
			return openClaudeJobRun({
				client: getHostServiceClientByUrl(activeHostUrl),
				harnessSessionId,
				createWorkspace,
			});
		},
		onSuccess: ({ workspaceId, sessionId, terminalId }) =>
			navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId },
				search: { sessionId, terminalId: terminalId ?? undefined },
			}),
		onError: (error) =>
			toast.error(
				errorMessage(error, t({ message: "Couldn't open the run as a chat" })),
			),
	});
}
