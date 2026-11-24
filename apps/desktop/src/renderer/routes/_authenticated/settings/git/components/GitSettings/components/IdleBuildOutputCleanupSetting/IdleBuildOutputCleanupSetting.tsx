import { Trans, useLingui } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import {
	DEFAULT_IDLE_BUILD_OUTPUT_DAYS,
	MAX_IDLE_BUILD_OUTPUT_DAYS,
	MIN_IDLE_BUILD_OUTPUT_DAYS,
} from "@superset/shared/idle-build-output";
import { Input } from "@superset/ui/input";
import { toast } from "@superset/ui/sonner";
import { Switch } from "@superset/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { SettingsRow } from "../../../../../components/SettingsRow";

interface IdleBuildOutputCleanupSettingProps {
	hostUrl: string | null;
	isHostOnline: boolean;
}

export function IdleBuildOutputCleanupSetting({
	hostUrl,
	isHostOnline,
}: IdleBuildOutputCleanupSettingProps) {
	const { t } = useLingui();
	const queryClient = useQueryClient();
	const queryKey = ["host-idle-build-output-cleanup", hostUrl] as const;

	const query = useQuery({
		queryKey,
		enabled: !!hostUrl && isHostOnline,
		queryFn: () => {
			if (!hostUrl) throw new Error("Host service unavailable");
			return getHostServiceClientByUrl(
				hostUrl,
			).settings.idleBuildOutputCleanup.get.query();
		},
	});

	const mutation = useMutation({
		mutationFn: (input: { enabled?: boolean; afterDays?: number }) => {
			if (!hostUrl) throw new Error("Host service unavailable");
			return getHostServiceClientByUrl(
				hostUrl,
			).settings.idleBuildOutputCleanup.set.mutate(input);
		},
		onSuccess: (data) => queryClient.setQueryData(queryKey, data),
		onError: (err) =>
			toast.error(
				errorMessage(err, t({ message: "Failed to update setting" })),
			),
	});

	const afterDays = query.data?.afterDays ?? DEFAULT_IDLE_BUILD_OUTPUT_DAYS;
	const [draft, setDraft] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: drop the draft when the stored value changes
	useEffect(() => {
		setDraft(null);
	}, [afterDays]);

	const commitDraft = (raw: string) => {
		const value = Number.parseInt(raw, 10);
		if (
			value >= MIN_IDLE_BUILD_OUTPUT_DAYS &&
			value <= MAX_IDLE_BUILD_OUTPUT_DAYS &&
			value !== afterDays
		) {
			mutation.mutate({ afterDays: value });
		}
		setDraft(null);
	};

	const disabled = !query.data || mutation.isPending;

	return (
		<SettingsRow
			htmlFor="clean-idle-build-output"
			label={t({ message: "Clean up idle worktrees" })}
			hint={t({
				message:
					"Delete ignored build folders (node_modules, target, build) in worktrees with no activity for this many days.",
			})}
		>
			<div className="flex items-center gap-2">
				<Input
					type="number"
					aria-label={t({ message: "Days without activity" })}
					min={MIN_IDLE_BUILD_OUTPUT_DAYS}
					max={MAX_IDLE_BUILD_OUTPUT_DAYS}
					value={draft ?? String(afterDays)}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={(e) => commitDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
					}}
					disabled={disabled}
					className="w-20"
				/>
				<span className="mr-2 text-sm text-muted-foreground">
					<Trans>days</Trans>
				</span>
				<Switch
					id="clean-idle-build-output"
					checked={query.data?.enabled ?? false}
					onCheckedChange={(enabled) => mutation.mutate({ enabled })}
					disabled={disabled}
				/>
			</div>
		</SettingsRow>
	);
}
