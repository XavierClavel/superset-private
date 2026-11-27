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

export type BackgroundWorkItem = {
	/** "" when none is known. */
	description: string;
	startedAtMs: number;
};

/**
 * Subagents, shells and monitors still running under an agent that is not
 * `working` itself. While the agent works, its spinner already shows activity.
 */
export function listBackgroundWork(
	bindings: Iterable<BackgroundWorkBinding>,
	statuses: ReadonlyMap<string, PaneStatus>,
): BackgroundWorkItem[] {
	const work: BackgroundWorkItem[] = [];
	for (const binding of bindings) {
		if (statuses.get(binding.terminalId) === "working") continue;
		for (const subagent of binding.subagents ?? []) {
			work.push({
				description: subagent.description ?? subagent.agentType ?? "",
				startedAtMs: subagent.startedAt,
			});
		}
		for (const task of binding.backgroundTasks ?? []) {
			if (isRunning(task))
				work.push({ description: task.name, startedAtMs: task.startedAtMs });
		}
	}
	return work;
}
