import { Trans } from "@lingui/react/macro";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import type { ReactNode } from "react";
import { LuFolderPlus, LuPencil, LuTrash2 } from "react-icons/lu";
import { DashboardSidebarMoveToFolderSubmenu } from "../../../../../DashboardSidebarMoveToFolderSubmenu";

interface DashboardSidebarProjectFolderContextMenuProps {
	folderId: string;
	onNewSubfolder: () => void;
	onRename: () => void;
	onDelete: () => void;
	children: ReactNode;
}

export function DashboardSidebarProjectFolderContextMenu({
	folderId,
	onNewSubfolder,
	onRename,
	onDelete,
	children,
}: DashboardSidebarProjectFolderContextMenuProps) {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
				<ContextMenuItem onSelect={onRename}>
					<LuPencil className="size-4 mr-2" />
					<Trans>Rename</Trans>
				</ContextMenuItem>
				<ContextMenuItem onSelect={onNewSubfolder}>
					<LuFolderPlus className="size-4 mr-2" />
					<Trans>New subfolder</Trans>
				</ContextMenuItem>
				<DashboardSidebarMoveToFolderSubmenu
					item={{ type: "folder", id: folderId }}
				/>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive" onSelect={onDelete}>
					<LuTrash2 className="size-4 mr-2" />
					<Trans>Delete folder</Trans>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
