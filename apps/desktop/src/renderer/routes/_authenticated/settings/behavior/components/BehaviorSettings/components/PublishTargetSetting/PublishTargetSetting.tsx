import { Trans, useLingui } from "@lingui/react/macro";
import type { PublishTarget } from "@superset/agent-setup/publish-target";
import { Label } from "@superset/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@superset/ui/select";
import { toast } from "@superset/ui/sonner";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { HighlightText } from "renderer/routes/_authenticated/settings/components/HighlightText";

export function PublishTargetSetting({ searchQuery }: { searchQuery: string }) {
	const { t } = useLingui();
	const utils = electronTrpc.useUtils();
	const { data: target, isLoading } =
		electronTrpc.settings.getPublishTarget.useQuery();
	const setPublishTarget = electronTrpc.settings.setPublishTarget.useMutation({
		onMutate: async ({ target: next }) => {
			await utils.settings.getPublishTarget.cancel();
			const previous = utils.settings.getPublishTarget.getData();
			utils.settings.getPublishTarget.setData(undefined, next);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				utils.settings.getPublishTarget.setData(undefined, context.previous);
			}
			toast.error(t({ message: "Couldn't update where agents publish" }));
		},
		onSettled: () => {
			utils.settings.getPublishTarget.invalidate();
		},
	});

	return (
		<div className="flex items-center justify-between gap-6">
			<div className="space-y-0.5">
				<Label htmlFor="publish-target" className="text-sm font-medium">
					<HighlightText
						text={t({ message: "Agent documents" })}
						query={searchQuery}
					/>
				</Label>
				<p className="text-xs text-muted-foreground">
					<Trans>
						Choose where Claude publishes reports and other documents: a Paradev
						page your organization can see and comment on, or a private Claude
						artifact.
					</Trans>
				</p>
			</div>
			<Select
				value={target ?? "page"}
				disabled={isLoading || setPublishTarget.isPending}
				onValueChange={(value) =>
					setPublishTarget.mutate({ target: value as PublishTarget })
				}
			>
				<SelectTrigger id="publish-target" className="w-[180px] shrink-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="page">
						<Trans>Paradev Pages</Trans>
					</SelectItem>
					<SelectItem value="artifact">
						<Trans>Claude artifacts</Trans>
					</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
