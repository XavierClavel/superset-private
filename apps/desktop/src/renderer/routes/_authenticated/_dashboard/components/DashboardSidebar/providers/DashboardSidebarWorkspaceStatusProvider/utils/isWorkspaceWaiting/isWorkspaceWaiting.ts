import type { TerminalAgentBinding } from "renderer/hooks/host-service/useTerminalAgentBindings";
import type { PaneStatus } from "shared/tabs-types";
import { hasBackgroundWork } from "../listBackgroundWork";

type WaitingBinding = Pick<
	TerminalAgentBinding,
	"terminalId" | "lastEventType" | "looping" | "subagents" | "backgroundTasks"
>;

const isWaiting = (binding: WaitingBinding) =>
	binding.lastEventType === "Stop" &&
	(binding.looping === true || hasBackgroundWork(binding));

export function isWorkspaceWaiting(
	bindings: Iterable<WaitingBinding>,
	statuses: ReadonlyMap<string, PaneStatus>,
): boolean {
	let waiting = false;
	for (const binding of bindings) {
		const status = statuses.get(binding.terminalId);
		if (status === "permission" || status === "failed") return false;
		if (isWaiting(binding)) waiting = true;
		else if (status === "working") return false;
	}
	return waiting;
}
