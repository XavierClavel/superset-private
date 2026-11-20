import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { usePlanBackend } from "renderer/hooks/usePlanBackend";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";

const ISSUE_STALE_MS = 30_000;

export function useLinearIssue(issueId: string) {
	const organizationId = useActiveOrganizationId();
	const backend = usePlanBackend();
	const options = { staleTime: ISSUE_STALE_MS, retry: false };
	const cloud = cloudTrpc.integration.linear.issue.useQuery(
		{ organizationId: organizationId ?? "", issueId },
		{ ...options, enabled: backend === "cloud" && !!organizationId },
	);
	const local = electronTrpc.linear.issue.useQuery(
		{ issueId },
		{ ...options, enabled: backend === "local" },
	);
	if (backend === "local") return local;
	return { ...cloud, isLoading: !backend || cloud.isLoading };
}
