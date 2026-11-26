import { FEATURE_FLAGS } from "@superset/shared/constants";
import { useFeatureFlagEnabled } from "posthog-js/react";
import { env } from "renderer/env.renderer";
import { electronTrpc } from "renderer/lib/electron-trpc";

export function useSidebarNavVisibility() {
	// `?? false`: the hook returns undefined until PostHog flags resolve.
	// Dev builds bypass the flag — the local dev account isn't in the
	// @superset.sh release condition.
	const isPluginsEnabled =
		(useFeatureFlagEnabled(FEATURE_FLAGS.PLUGINS) ?? false) ||
		env.NODE_ENV === "development";
	const { data: isUsageInSidebarEnabled } =
		electronTrpc.settings.getShowUsageInSidebar.useQuery();
	return {
		isPluginsEnabled,
		isUsageInSidebarEnabled: isUsageInSidebarEnabled ?? false,
	};
}
