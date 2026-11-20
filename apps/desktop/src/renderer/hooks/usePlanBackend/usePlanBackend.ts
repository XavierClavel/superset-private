import { isPaidPlanTier } from "@superset/shared/billing";
import { useCurrentPlan } from "renderer/hooks/useCurrentPlan";

export type PlanBackend = "cloud" | "local";

/**
 * Paid plans use the organization's cloud features. Free plans have none, so
 * Linear uses a personal API key and Automations use Claude Jobs, both on this
 * machine. Undefined until the plan is known.
 */
export function usePlanBackend(): PlanBackend | undefined {
	const { plan, isReady } = useCurrentPlan();
	if (!isReady) return undefined;
	return isPaidPlanTier(plan) ? "cloud" : "local";
}
