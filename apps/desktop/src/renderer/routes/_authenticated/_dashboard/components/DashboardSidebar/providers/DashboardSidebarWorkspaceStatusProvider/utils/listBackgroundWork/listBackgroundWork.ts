import type { BackgroundTask } from "@superset/chat/protocol";
import type { TerminalAgentBinding } from "renderer/hooks/host-service/useTerminalAgentBindings";
import type { PaneStatus } from "shared/tabs-types";

type BackgroundWorkBinding = Pick<
	TerminalAgentBinding,
	"terminalId" | "subagents" | "backgroundTasks"
>;

const isRunning = (task: BackgroundTask) =>
	task.subagentStatus === undefined || task.subagentStatus === "running";

export function hasBackgroundWork(binding: BackgroundWorkBinding): boolean {
	return (
		(binding.subagents?.length ?? 0) > 0 ||
		(binding.backgroundTasks ?? []).some(isRunning)
	);
}

/**
 * Subagents, shells and monitors still running under an agent that is not
 * `working` itself, one description each ("" when none is known). While the
 * agent works, its spinner already shows activity.
 */
export function listBackgroundWork(
	bindings: Iterable<BackgroundWorkBinding>,
	statuses: ReadonlyMap<string, PaneStatus>,
): string[] {
	const work: string[] = [];
	for (const binding of bindings) {
		if (statuses.get(binding.terminalId) === "working") continue;
		for (const subagent of binding.subagents ?? []) {
			work.push(subagent.description ?? subagent.agentType ?? "");
		}
		for (const task of binding.backgroundTasks ?? []) {
			if (isRunning(task)) work.push(task.name);
		}
	}
	return work;
}
