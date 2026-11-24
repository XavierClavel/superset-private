import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import { alert } from "@superset/ui/atoms/Alert";
import { toast } from "@superset/ui/sonner";
import type { ClaudeJob } from "lib/trpc/routers/claude-jobs/types";
import { electronTrpc } from "renderer/lib/electron-trpc";

type JobRef = Pick<ClaudeJob, "id" | "name">;

/** Run, pause, resume and delete Claude Jobs jobs, with their toasts. */
export function useClaudeJobActions() {
	const { t } = useLingui();
	const utils = electronTrpc.useUtils();
	const refresh = () => void utils.claudeJobs.status.invalidate();

	const startMutation = electronTrpc.claudeJobs.start.useMutation({
		onSettled: refresh,
	});
	const setEnabledMutation = electronTrpc.claudeJobs.setEnabled.useMutation({
		onSettled: refresh,
	});
	const deleteMutation = electronTrpc.claudeJobs.delete.useMutation({
		onSettled: refresh,
	});
	const openMutation = electronTrpc.claudeJobs.open.useMutation({
		onError: (error) => toast.error(errorMessage(error)),
	});

	const runNow = ({ id, name }: JobRef) =>
		startMutation.mutate(
			{ id },
			{
				onSuccess: () => toast.success(t({ message: `Running "${name}" now` })),
				onError: (error) =>
					toast.error(
						errorMessage(error, t({ message: "Failed to trigger run" })),
					),
			},
		);

	const setEnabled = ({ id, name }: JobRef, enabled: boolean) =>
		setEnabledMutation.mutate(
			{ id, enabled },
			{
				onSuccess: () =>
					toast.success(
						enabled
							? t({ message: `"${name}" resumed` })
							: t({ message: `"${name}" paused` }),
					),
				onError: (error) =>
					toast.error(
						errorMessage(error, t({ message: "Failed to update automation" })),
					),
			},
		);

	const confirmDelete = (job: JobRef, options?: { onDeleted?: () => void }) =>
		alert({
			title: t({ message: `Delete "${job.name}" permanently?` }),
			description: t({
				message: "Claude Jobs stops running it. This can't be undone.",
			}),
			actions: [
				{
					label: t({ message: "Cancel" }),
					variant: "outline",
					onClick: () => {},
				},
				{
					label: t({ message: "Delete permanently" }),
					variant: "destructive",
					onClick: () =>
						deleteMutation.mutate(
							{ id: job.id },
							{
								onSuccess: () => {
									toast.success(t({ message: `Deleted "${job.name}"` }));
									options?.onDeleted?.();
								},
								onError: (error) =>
									toast.error(
										errorMessage(
											error,
											t({ message: "Failed to delete automation" }),
										),
									),
							},
						),
				},
			],
		});

	return {
		runNow,
		setEnabled,
		confirmDelete,
		openApp: () => openMutation.mutate(),
		startingId: startMutation.isPending
			? startMutation.variables?.id
			: undefined,
	};
}
