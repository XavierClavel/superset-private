import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useUserPreferences } from "renderer/hooks/useUserPreferences";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import {
	indexLabelsByWorkspace,
	resolveActiveFilterLabel,
	type WorkspaceLabel,
	type WorkspaceLabelAssignment,
} from "./useWorkspaceLabels.utils";

export type { WorkspaceLabel };

interface WorkspaceLabelsData {
	labels: WorkspaceLabel[];
	assignments: WorkspaceLabelAssignment[];
}

const EMPTY_DATA: WorkspaceLabelsData = { labels: [], assignments: [] };

export interface UseWorkspaceLabelsResult {
	labels: WorkspaceLabel[];
	labelsByWorkspaceId: ReadonlyMap<string, WorkspaceLabel[]>;
	activeFilterLabel: WorkspaceLabel | null;
	setActiveFilterLabelId: (id: string | null) => void;
	createLabel: (input: {
		name: string;
		color: string;
	}) => Promise<WorkspaceLabel>;
	updateLabel: (
		id: string,
		patch: { name?: string; color?: string },
	) => Promise<void>;
	deleteLabel: (id: string) => Promise<void>;
	setWorkspaceLabels: (
		workspaceId: string,
		labelIds: string[],
	) => Promise<void>;
}

export function useWorkspaceLabels(): UseWorkspaceLabelsResult {
	const queryClient = useQueryClient();
	const { activeHostUrl } = useLocalHostService();
	const { preferences, setSidebarLabelFilterId } = useUserPreferences();
	const filterLabelId = preferences.sidebarLabelFilterId;
	const filterLabelIdRef = useRef(filterLabelId);
	useEffect(() => {
		filterLabelIdRef.current = filterLabelId;
	}, [filterLabelId]);
	const queryKey = useMemo(
		() => ["workspace-labels", activeHostUrl],
		[activeHostUrl],
	);

	const { data = EMPTY_DATA } = useQuery({
		queryKey,
		enabled: activeHostUrl !== null,
		networkMode: "always",
		retry: 1,
		queryFn: async (): Promise<WorkspaceLabelsData> => {
			if (!activeHostUrl) return EMPTY_DATA;
			const client = getHostServiceClientByUrl(activeHostUrl);
			return (await client.workspaceLabels.list.query()) as WorkspaceLabelsData;
		},
	});

	const labels = data.labels;
	const labelsByWorkspaceId = useMemo(
		() => indexLabelsByWorkspace(data.labels, data.assignments),
		[data],
	);
	const activeFilterLabel = useMemo(
		() => resolveActiveFilterLabel(labels, filterLabelId),
		[labels, filterLabelId],
	);

	const requireClient = useCallback(() => {
		if (!activeHostUrl) throw new Error("Local host service is not available");
		return getHostServiceClientByUrl(activeHostUrl);
	}, [activeHostUrl]);

	const invalidate = useCallback(
		() => queryClient.invalidateQueries({ queryKey }),
		[queryClient, queryKey],
	);

	const createMutation = useMutation({
		networkMode: "always",
		mutationFn: (input: { name: string; color: string }) =>
			requireClient().workspaceLabels.create.mutate(
				input,
			) as Promise<WorkspaceLabel>,
		onSettled: invalidate,
	});

	const updateMutation = useMutation({
		networkMode: "always",
		mutationFn: (input: { id: string; name?: string; color?: string }) =>
			requireClient().workspaceLabels.update.mutate(input),
		onSettled: invalidate,
	});

	const deleteMutation = useMutation({
		networkMode: "always",
		mutationFn: (id: string) =>
			requireClient().workspaceLabels.delete.mutate({ id }),
		onSettled: invalidate,
	});

	const setForWorkspaceMutation = useMutation({
		networkMode: "always",
		mutationFn: (input: { workspaceId: string; labelIds: string[] }) =>
			requireClient().workspaceLabels.setForWorkspace.mutate(input),
		onMutate: async ({ workspaceId, labelIds }) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<WorkspaceLabelsData>(queryKey);
			queryClient.setQueryData<WorkspaceLabelsData>(queryKey, (current) =>
				current
					? {
							...current,
							assignments: [
								...current.assignments.filter(
									(assignment) => assignment.workspaceId !== workspaceId,
								),
								...labelIds.map((labelId) => ({ workspaceId, labelId })),
							],
						}
					: current,
			);
			return { previous };
		},
		onError: (_error, _input, context) => {
			if (context?.previous)
				queryClient.setQueryData(queryKey, context.previous);
		},
		onSettled: invalidate,
	});

	const createLabelAsync = createMutation.mutateAsync;
	const updateLabelAsync = updateMutation.mutateAsync;
	const deleteLabelAsync = deleteMutation.mutateAsync;
	const setForWorkspaceAsync = setForWorkspaceMutation.mutateAsync;

	const createLabel = useCallback(
		(input: { name: string; color: string }) => createLabelAsync(input),
		[createLabelAsync],
	);

	const updateLabel = useCallback(
		async (id: string, patch: { name?: string; color?: string }) => {
			await updateLabelAsync({ id, ...patch });
		},
		[updateLabelAsync],
	);

	const deleteLabel = useCallback(
		async (id: string) => {
			await deleteLabelAsync(id);
			if (filterLabelIdRef.current === id) {
				setSidebarLabelFilterId(null);
			}
		},
		[deleteLabelAsync, setSidebarLabelFilterId],
	);

	const setWorkspaceLabels = useCallback(
		async (workspaceId: string, labelIds: string[]) => {
			await setForWorkspaceAsync({ workspaceId, labelIds });
		},
		[setForWorkspaceAsync],
	);

	return useMemo(
		() => ({
			labels,
			labelsByWorkspaceId,
			activeFilterLabel,
			setActiveFilterLabelId: setSidebarLabelFilterId,
			createLabel,
			updateLabel,
			deleteLabel,
			setWorkspaceLabels,
		}),
		[
			labels,
			labelsByWorkspaceId,
			activeFilterLabel,
			setSidebarLabelFilterId,
			createLabel,
			updateLabel,
			deleteLabel,
			setWorkspaceLabels,
		],
	);
}
