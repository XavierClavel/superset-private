import { useLingui } from "@lingui/react/macro";
import { formatCompactRelativeTime } from "@superset/i18n/format";
import { cn } from "@superset/ui/utils";
import { LuX } from "react-icons/lu";
import { useOpenClaudeJobRun } from "renderer/routes/_authenticated/_dashboard/hooks/useOpenClaudeJobRun";
import { STROKE_WIDTH } from "renderer/screens/main/components/WorkspaceSidebar/constants";
import type { ClaudeJobChat } from "../../utils/claudeJobChats";

interface ClaudeJobChatRowProps {
	chat: ClaudeJobChat;
	isRemoving: boolean;
	onRemove: () => void;
}

export function ClaudeJobChatRow({
	chat,
	isRemoving,
	onRemove,
}: ClaudeJobChatRowProps) {
	const { t } = useLingui();
	const openRun = useOpenClaudeJobRun();
	return (
		<div className="group/row flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground">
			<button
				type="button"
				disabled={openRun.isPending || isRemoving}
				onClick={() => openRun.mutate(chat.harnessSessionId)}
				className="flex h-full min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			>
				<span
					className={cn(
						"size-1.5 shrink-0 rounded-full",
						chat.isRunning ? "bg-blue-500" : "bg-transparent",
					)}
				/>
				<span className="min-w-0 flex-1 truncate">
					{chat.jobName ?? t({ message: "Automation run" })}
				</span>
				<span className="shrink-0 text-xs tabular-nums group-focus-within/row:hidden group-hover/row:hidden">
					{formatCompactRelativeTime(chat.at)}
				</span>
			</button>
			<button
				type="button"
				onClick={onRemove}
				disabled={isRemoving}
				aria-label={t({ message: "Remove" })}
				className="hidden size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-focus-within/row:flex group-hover/row:flex"
			>
				<LuX className="size-3" strokeWidth={STROKE_WIDTH} />
			</button>
		</div>
	);
}
