import { useMemo } from "react";
import { useActiveOrganizationId } from "renderer/hooks/useActiveOrganizationId";
import { useDebouncedValue } from "renderer/hooks/useDebouncedValue";
import { usePlanBackend } from "renderer/hooks/usePlanBackend";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { electronTrpc } from "renderer/lib/electron-trpc";
import {
	matchesStatusFilter,
	type StatusFilterValue,
} from "../../../../../../utils/statusFilter";
import { cloudStatusFilter } from "./utils/cloudStatusFilter";

const SEARCH_DEBOUNCE_MS = 300;
const ISSUES_STALE_MS = 30_000;

export interface LinearIssueFilters {
	teamId: string | null;
	projectId?: string | null;
	statuses: StatusFilterValue[];
	assignee: string | null;
	search: string;
}

export function useLinearIssues(filters: LinearIssueFilters) {
	const organizationId = useActiveOrganizationId();
	const backend = usePlanBackend();
	const search = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);

	const input = {
		teamId: filters.teamId,
		projectId: filters.projectId ?? null,
		assignee: filters.assignee,
		search: search || null,
	};
	const options = {
		getNextPageParam: (page: { nextCursor: string | null }) => page.nextCursor,
		staleTime: ISSUES_STALE_MS,
		retry: false,
	};
	const cloud = cloudTrpc.integration.linear.issues.useInfiniteQuery(
		{
			...input,
			organizationId: organizationId ?? "",
			status: cloudStatusFilter(filters.statuses),
		},
		{ ...options, enabled: backend === "cloud" && !!organizationId },
	);
	const local = electronTrpc.linear.issues.useInfiniteQuery(
		{ ...input, statuses: filters.statuses },
		{ ...options, enabled: backend === "local" },
	);
	const query = backend === "local" ? local : cloud;

	const issues = useMemo(
		() =>
			(query.data?.pages.flatMap((page) => page.issues) ?? []).filter((issue) =>
				matchesStatusFilter(issue.state.type, filters.statuses),
			),
		[query.data, filters.statuses],
	);

	return { ...query, issues };
}
