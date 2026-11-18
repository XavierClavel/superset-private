import { useMemo } from "react";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useDebouncedValue } from "renderer/hooks/useDebouncedValue";
import { useLinearBackend } from "renderer/hooks/useLinearBackend";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";
import type { TabValue } from "../../../TasksTopBar";

const SEARCH_DEBOUNCE_MS = 300;
const ISSUES_STALE_MS = 30_000;

export interface LinearIssueFilters {
	teamId: string | null;
	projectId?: string | null;
	status: TabValue;
	assignee: string | null;
	search: string;
}

export function useLinearIssues(filters: LinearIssueFilters) {
	const organizationId = useActiveOrganizationId();
	const backend = useLinearBackend();
	const search = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);

	const input = {
		teamId: filters.teamId,
		projectId: filters.projectId ?? null,
		status: filters.status,
		assignee: filters.assignee,
		search: search || null,
	};
	const options = {
		getNextPageParam: (page: { nextCursor: string | null }) => page.nextCursor,
		staleTime: ISSUES_STALE_MS,
		retry: false,
	};
	const cloud = cloudTrpc.integration.linear.issues.useInfiniteQuery(
		{ ...input, organizationId: organizationId ?? "" },
		{ ...options, enabled: backend === "cloud" && !!organizationId },
	);
	const local = electronTrpc.linear.issues.useInfiniteQuery(input, {
		...options,
		enabled: backend === "local",
	});
	const query = backend === "local" ? local : cloud;

	const issues = useMemo(
		() => query.data?.pages.flatMap((page) => page.issues) ?? [],
		[query.data],
	);

	return { ...query, issues };
}
