import { useLingui } from "@lingui/react/macro";
import { useSidebarSectionsCollapseStore } from "renderer/stores/sidebar-sections-collapse";
import { DashboardSidebarSectionHeader } from "../DashboardSidebarSectionHeader";
import { ClaudeJobChatRow } from "./components/ClaudeJobChatRow";
import { useClaudeJobChats } from "./hooks/useClaudeJobChats";

/** The Claude Jobs runs you continued in a chat. Hidden until there is one. */
export function DashboardSidebarAutomationsSection() {
	const { t } = useLingui();
	const { chats, removeRun } = useClaudeJobChats();
	const isSectionCollapsed = useSidebarSectionsCollapseStore(
		(s) => s.collapsed.automations,
	);
	if (chats.length === 0) return null;
	return (
		<div className="mt-3 pb-1 first:mt-0">
			<DashboardSidebarSectionHeader
				label={t({ message: "Automations" })}
				section="automations"
			/>
			{!isSectionCollapsed && (
				<div className="flex flex-col gap-px px-2">
					{chats.map((chat) => (
						<ClaudeJobChatRow
							key={chat.harnessSessionId}
							chat={chat}
							isRemoving={
								removeRun.isPending &&
								removeRun.variables?.harnessSessionId === chat.harnessSessionId
							}
							onRemove={() => removeRun.mutate(chat)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
