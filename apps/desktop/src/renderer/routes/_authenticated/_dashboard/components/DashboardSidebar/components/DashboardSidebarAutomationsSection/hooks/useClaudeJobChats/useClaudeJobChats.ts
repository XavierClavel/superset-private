import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import { isMissingProcedureError } from "@superset/shared/missing-procedure-error";
import { toast } from "@superset/ui/sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useWorkspaceEvent } from "renderer/hooks/host-service/useWorkspaceEvent";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { isClaudeJobsWorkspace } from "renderer/routes/_authenticated/_dashboard/utils/claudeJobsWorkspace";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { type ClaudeJobChat, claudeJobChats } from "../../utils/claudeJobChats";

const RUN_LABELS_STALE_MS = 60_000;

export function useClaudeJobChats() {
	const { t } = useLingui();
	const { workspaces } = useHostWorkspaces();
	const { machineId, activeHostUrl } = useLocalHostService();
	const workspaceId =
		workspaces.find(
			(workspace) =>
				workspace.hostId === machineId && isClaudeJobsWorkspace(workspace),
		)?.id ?? null;
	const enabled = workspaceId !== null && activeHostUrl !== null;

	const chatsQuery = useQuery({
		queryKey: ["claude-job-chats", activeHostUrl, workspaceId],
		enabled,
		queryFn: async () => {
			if (!workspaceId || !activeHostUrl) return null;
			const client = getHostServiceClientByUrl(activeHostUrl);
			const [chats, prompted] = await Promise.all([
				client.sessions.list.query({ workspaceId, limit: 200 }),
				client.sessions.prompted
					.query({ workspaceId })
					.catch((error: unknown) => {
						if (isMissingProcedureError(error)) return [];
						throw error;
					}),
			]);
			return { chats, prompted };
		},
	});
	useWorkspaceEvent(
		"chat:sessions-changed",
		workspaceId ?? "",
		() => void chatsQuery.refetch(),
		enabled,
	);

	const removeRun = useMutation({
		mutationFn: async (run: ClaudeJobChat) => {
			if (!workspaceId || !activeHostUrl) return;
			const client = getHostServiceClientByUrl(activeHostUrl);
			await Promise.all(
				run.chatIds.map((sessionId) =>
					client.sessions.close.mutate({ workspaceId, sessionId }),
				),
			);
		},
		onSettled: () => chatsQuery.refetch(),
		onError: (error) =>
			toast.error(
				errorMessage(error, t({ message: "Couldn't remove the run" })),
			),
	});

	const hasPrompted = (chatsQuery.data?.prompted.length ?? 0) > 0;
	const statusQuery = electronTrpc.claudeJobs.status.useQuery(undefined, {
		enabled: hasPrompted,
		staleTime: RUN_LABELS_STALE_MS,
	});

	const chats = useMemo(() => {
		if (!chatsQuery.data) return [];
		return claudeJobChats({
			chats: chatsQuery.data.chats,
			prompted: chatsQuery.data.prompted,
			jobs: statusQuery.data?.state === "ready" ? statusQuery.data.jobs : [],
		});
	}, [chatsQuery.data, statusQuery.data]);

	return { chats, removeRun };
}
