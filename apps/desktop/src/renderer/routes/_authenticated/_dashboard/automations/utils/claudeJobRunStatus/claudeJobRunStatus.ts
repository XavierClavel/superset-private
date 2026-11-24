import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ClaudeJobRunStatus } from "lib/trpc/routers/claude-jobs/types";

export const CLAUDE_JOB_RUN_STATUS_META: Record<
	ClaudeJobRunStatus,
	{ dot: string; label: MessageDescriptor }
> = {
	running: { dot: "bg-blue-500", label: msg({ message: "running" }) },
	ok: { dot: "bg-emerald-500", label: msg({ message: "succeeded" }) },
	warning: { dot: "bg-amber-500", label: msg({ message: "warning" }) },
	failed: { dot: "bg-red-500", label: msg({ message: "failed" }) },
	timeout: { dot: "bg-red-500", label: msg({ message: "timed out" }) },
	interrupted: { dot: "bg-slate-400", label: msg({ message: "interrupted" }) },
};
