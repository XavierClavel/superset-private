import { Trans } from "@lingui/react/macro";
import {
	ContextMenuCheckboxItem,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@superset/ui/context-menu";
import { LuPlus, LuTag } from "react-icons/lu";
import { toPastelColor } from "renderer/routes/_authenticated/components/WorkspaceLabelPill";
import { useWorkspaceLabelToggle } from "../../../../../../hooks/useWorkspaceLabelToggle";

interface DashboardSidebarWorkspaceLabelsSubmenuProps {
	workspaceId: string;
	onNewLabel: () => void;
}

export function DashboardSidebarWorkspaceLabelsSubmenu({
	workspaceId,
	onNewLabel,
}: DashboardSidebarWorkspaceLabelsSubmenuProps) {
	const { labels, assignedIds, toggle } = useWorkspaceLabelToggle(workspaceId);

	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger>
				<LuTag className="size-4 mr-2" />
				<Trans context="personal workspace labels">Labels</Trans>
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				{labels.map((label) => (
					<ContextMenuCheckboxItem
						key={label.id}
						checked={assignedIds.includes(label.id)}
						onCheckedChange={(checked) => toggle(label.id, checked === true)}
						onSelect={(event) => event.preventDefault()}
					>
						<span
							className="size-2 shrink-0 rounded-full mr-2"
							style={{ backgroundColor: toPastelColor(label.color) }}
						/>
						{label.name}
					</ContextMenuCheckboxItem>
				))}
				{labels.length > 0 && <ContextMenuSeparator />}
				<ContextMenuItem onSelect={onNewLabel}>
					<LuPlus className="size-4 mr-2" />
					<Trans>New label…</Trans>
				</ContextMenuItem>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
