import { Trans, useLingui } from "@lingui/react/macro";
import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@superset/ui/context-menu";
import { useMemo } from "react";
import { LuFolder, LuFolderInput, LuFolderPlus } from "react-icons/lu";
import type { ProjectTreeItemRef } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState/utils/projectFolderMutations";
import { useDashboardSidebarProjectFolders } from "../../providers/DashboardSidebarProjectFoldersProvider";
import { listFolderMenuEntries } from "./utils/listFolderMenuEntries";

interface DashboardSidebarMoveToFolderSubmenuProps {
	item: ProjectTreeItemRef;
}

/** "Move to folder" entries for a project or folder context menu. */
export function DashboardSidebarMoveToFolderSubmenu({
	item,
}: DashboardSidebarMoveToFolderSubmenuProps) {
	const { t } = useLingui();
	const { folders, placements, createFolder, moveItem } =
		useDashboardSidebarProjectFolders();
	const currentParentId =
		item.type === "folder"
			? (folders.find((folder) => folder.id === item.id)?.parentFolderId ??
				null)
			: (placements.get(item.id)?.folderId ?? null);
	const entries = useMemo(
		() =>
			listFolderMenuEntries(folders, item.type === "folder" ? item.id : null),
		[folders, item],
	);

	const moveInto = (folderId: string | null) =>
		moveItem(item, { parentFolderId: folderId, position: { kind: "end" } });
	const moveIntoNewFolder = () => {
		const folderId = createFolder(
			currentParentId,
			t({ message: "New folder" }),
		);
		moveItem(item, { parentFolderId: folderId, position: { kind: "end" } });
	};

	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger>
				<LuFolderInput className="size-4 mr-2" />
				<Trans>Move to folder</Trans>
			</ContextMenuSubTrigger>
			<ContextMenuSubContent className="w-56 max-h-80 overflow-y-auto">
				<ContextMenuItem onSelect={moveIntoNewFolder}>
					<LuFolderPlus className="size-4 mr-2" />
					<Trans>New folder</Trans>
				</ContextMenuItem>
				<ContextMenuItem
					disabled={currentParentId === null}
					onSelect={() => moveInto(null)}
				>
					<Trans>Top level</Trans>
				</ContextMenuItem>
				{entries.length > 0 && <ContextMenuSeparator />}
				{entries.map((entry) => (
					<ContextMenuItem
						key={entry.folder.id}
						disabled={entry.folder.id === currentParentId}
						onSelect={() => moveInto(entry.folder.id)}
						style={{ paddingLeft: `${0.5 + entry.depth * 0.75}rem` }}
					>
						<LuFolder className="size-4 mr-2 shrink-0" />
						<span className="truncate">{entry.folder.name}</span>
					</ContextMenuItem>
				))}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
