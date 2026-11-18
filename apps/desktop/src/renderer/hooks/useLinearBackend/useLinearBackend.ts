import { isPaidPlanTier } from "@superset/shared/billing";
import { useCurrentPlan } from "renderer/hooks/useCurrentPlan";

export type LinearBackend = "cloud" | "local";

/**
 * Paid plans reach Linear through the organization's cloud connection. Free
 * plans have none, so they use a personal API key stored on this machine.
 * Undefined until the plan is known.
 */
export function useLinearBackend(): LinearBackend | undefined {
	const { plan, isReady } = useCurrentPlan();
	if (!isReady) return undefined;
	return isPaidPlanTier(plan) ? "cloud" : "local";
}
