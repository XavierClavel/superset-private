import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useLinearBackend } from "renderer/hooks/useLinearBackend";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";

const ISSUE_STALE_MS = 30_000;

export function useLinearIssue(issueId: string) {
	const organizationId = useActiveOrganizationId();
	const backend = useLinearBackend();
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
