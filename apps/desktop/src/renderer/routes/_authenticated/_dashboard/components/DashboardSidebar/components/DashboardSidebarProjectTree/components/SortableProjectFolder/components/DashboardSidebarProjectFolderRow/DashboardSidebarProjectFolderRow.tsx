import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { HiChevronRight } from "react-icons/hi2";
import { LuFolder, LuFolderOpen } from "react-icons/lu";
import { RenameInput } from "renderer/screens/main/components/WorkspaceSidebar/RenameInput";

interface DashboardSidebarProjectFolderRowProps
	extends ComponentPropsWithoutRef<"div"> {
	name: string;
	/** Null hides the count. */
	projectCount: number | null;
	isCollapsed: boolean;
	/** True while a dragged item would drop into this folder. */
	isDropTarget: boolean;
	isRenaming: boolean;
	renameValue: string;
	onRenameValueChange: (value: string) => void;
	onSubmitRename: () => void;
	onCancelRename: () => void;
	onStartRename: () => void;
	onToggleCollapse: () => void;
}

export const DashboardSidebarProjectFolderRow = forwardRef<
	HTMLDivElement,
	DashboardSidebarProjectFolderRowProps
>(
	(
		{
			name,
			projectCount,
			isCollapsed,
			isDropTarget,
			isRenaming,
			renameValue,
			onRenameValueChange,
			onSubmitRename,
			onCancelRename,
			onStartRename,
			onToggleCollapse,
			className,
			...props
		},
		ref,
	) => {
		const { t } = useLingui();
		const FolderIcon = isCollapsed ? LuFolder : LuFolderOpen;
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: The header acts as a single toggle target in view mode while preserving the inline rename field.
			<div
				ref={ref}
				role={isRenaming ? undefined : "button"}
				tabIndex={isRenaming ? undefined : 0}
				onClick={isRenaming ? undefined : onToggleCollapse}
				onDoubleClick={isRenaming ? undefined : onStartRename}
				onKeyDown={
					isRenaming
						? undefined
						: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onToggleCollapse();
								}
							}
				}
				className={cn(
					"group mx-2 flex h-7 items-center gap-2 rounded-md pl-2 pr-2 text-[13px] font-medium text-muted-foreground",
					"hover:bg-fill-hover hover:text-foreground transition-colors",
					isDropTarget && "bg-fill-hover text-foreground ring-1 ring-primary",
					className,
				)}
				{...props}
			>
				<div className="flex size-4 shrink-0 items-center justify-center">
					<FolderIcon className="size-4 group-hover:hidden" />
					<HiChevronRight
						className={cn(
							"hidden size-4 transition-transform group-hover:block",
							!isCollapsed && "rotate-90",
						)}
					/>
				</div>
				{isRenaming ? (
					<RenameInput
						value={renameValue}
						onChange={onRenameValueChange}
						onSubmit={onSubmitRename}
						onCancel={onCancelRename}
						className="-ml-1 h-6 min-w-0 flex-1 bg-transparent border-none px-1 py-0 text-sm font-medium text-foreground outline-none"
					/>
				) : (
					<>
						<span className="min-w-0 flex-1 truncate">{name}</span>
						{projectCount !== null && (
							<span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
								<span aria-hidden>{projectCount}</span>
								<span className="sr-only">
									{t({
										message: plural(projectCount, {
											one: "# project",
											other: "# projects",
										}),
									})}
								</span>
							</span>
						)}
					</>
				)}
			</div>
		);
	},
);
