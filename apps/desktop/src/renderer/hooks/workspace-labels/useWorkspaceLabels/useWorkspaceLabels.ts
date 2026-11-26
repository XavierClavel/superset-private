import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useUserPreferences } from "renderer/hooks/useUserPreferences";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import {
	indexLabelsByWorkspace,
	resolveActiveFilterKeys,
	selectOnlyFilterKey,
	toggleFilterKey,
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
	/** Label ids and NO_LABEL_FILTER_KEY the sidebar shows; null shows all. */
	activeFilterKeys: ReadonlySet<string> | null;
	selectOnlyFilterKey: (key: string) => void;
	toggleFilterKey: (key: string) => void;
	clearLabelFilter: () => void;
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
	const { preferences, setSidebarLabelFilterIds } = useUserPreferences();
	const storedFilterKeys = preferences.sidebarLabelFilterIds;
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
	const activeFilterKeys = useMemo(
		() => resolveActiveFilterKeys(labels, storedFilterKeys),
		[labels, storedFilterKeys],
	);

	const selectOnly = useCallback(
		(key: string) =>
			setSidebarLabelFilterIds(selectOnlyFilterKey(activeFilterKeys, key)),
		[activeFilterKeys, setSidebarLabelFilterIds],
	);
	const toggle = useCallback(
		(key: string) =>
			setSidebarLabelFilterIds(toggleFilterKey(labels, activeFilterKeys, key)),
		[labels, activeFilterKeys, setSidebarLabelFilterIds],
	);
	const clearLabelFilter = useCallback(
		() => setSidebarLabelFilterIds(null),
		[setSidebarLabelFilterIds],
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
		},
		[deleteLabelAsync],
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
			activeFilterKeys,
			selectOnlyFilterKey: selectOnly,
			toggleFilterKey: toggle,
			clearLabelFilter,
			createLabel,
			updateLabel,
			deleteLabel,
			setWorkspaceLabels,
		}),
		[
			labels,
			labelsByWorkspaceId,
			activeFilterKeys,
			selectOnly,
			toggle,
			clearLabelFilter,
			createLabel,
			updateLabel,
			deleteLabel,
			setWorkspaceLabels,
		],
	);
}
