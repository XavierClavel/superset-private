import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useLinearBackend } from "renderer/hooks/useLinearBackend";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";

const WORKSPACE_STALE_MS = 10 * 60_000;

export function useLinearConnection({ enabled = true } = {}) {
	const organizationId = useActiveOrganizationId();
	return cloudTrpc.integration.linear.getConnection.useQuery(
		{ organizationId: organizationId ?? "" },
		{ enabled: enabled && !!organizationId },
	);
}

export function useLinearAccount() {
	const backend = useLinearBackend();
	const cloud = useLinearConnection({ enabled: backend === "cloud" });
	const local = electronTrpc.linear.status.useQuery(undefined, {
		enabled: backend === "local",
	});

	if (backend === "local") {
		return {
			backend,
			isLoading: local.isLoading,
			isConnected: !!local.data?.connected,
			needsReconnect: false,
		};
	}
	return {
		backend,
		isLoading: !backend || cloud.isLoading,
		isConnected: !!cloud.data && !cloud.data.needsReconnect,
		needsReconnect: !!cloud.data?.needsReconnect,
	};
}

export function useLinearWorkspace({ enabled = true } = {}) {
	const organizationId = useActiveOrganizationId();
	const backend = useLinearBackend();
	const options = { staleTime: WORKSPACE_STALE_MS, retry: false };
	const cloud = cloudTrpc.integration.linear.workspace.useQuery(
		{ organizationId: organizationId ?? "" },
		{ ...options, enabled: enabled && backend === "cloud" && !!organizationId },
	);
	const local = electronTrpc.linear.workspace.useQuery(undefined, {
		...options,
		enabled: enabled && backend === "local",
	});
	return backend === "local" ? local : cloud;
}
