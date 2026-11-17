import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { WaveSpinner } from "@superset/ui/atoms/WaveSpinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { Bot } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { HiChevronRight, HiMiniPlus } from "react-icons/hi2";
import { ProjectThumbnail } from "renderer/routes/_authenticated/components/ProjectThumbnail";
import { StatusIndicator } from "renderer/screens/main/components/StatusIndicator";
import { RenameInput } from "renderer/screens/main/components/WorkspaceSidebar/RenameInput";
import type { ActivePaneStatus } from "shared/tabs-types";

const HIDE_ON_HOVER = "group-hover:hidden group-has-[:focus]:hidden";

interface DashboardSidebarProjectRowProps
	extends ComponentPropsWithoutRef<"div"> {
	projectName: string;
	iconUrl: string | null;
	projectColor: string | null;
	isCollapsed: boolean;
	agentStatus: ActivePaneStatus | null;
	backgroundWork: number;
	isRenaming: boolean;
	renameValue: string;
	onRenameValueChange: (value: string) => void;
	onSubmitRename: () => void;
	onCancelRename: () => void;
	/** Absent when the name is not the user's to change. */
	onStartRename?: () => void;
	onToggleCollapse: () => void;
	onNewWorkspace: () => void;
}

export const DashboardSidebarProjectRow = forwardRef<
	HTMLDivElement,
	DashboardSidebarProjectRowProps
>(
	(
		{
			projectName,
			iconUrl,
			projectColor,
			isCollapsed,
			agentStatus,
			backgroundWork,
			isRenaming,
			renameValue,
			onRenameValueChange,
			onSubmitRename,
			onCancelRename,
			onStartRename,
			onToggleCollapse,
			onNewWorkspace,
			className,
			...props
		},
		ref,
	) => {
		const { t } = useLingui();
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: The header acts as a single toggle target in view mode while preserving nested inline controls.
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
					"group mx-2 flex h-7 items-center rounded-md pl-2 pr-1 text-[13px] font-medium",
					"hover:bg-fill-hover transition-colors",
					className,
				)}
				{...props}
			>
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<div className="flex size-4 shrink-0 items-center justify-center">
						<ProjectThumbnail
							projectName={projectName}
							iconUrl={iconUrl}
							color={projectColor}
							className="size-4 group-hover:hidden"
						/>
						<HiChevronRight
							className={cn(
								"hidden size-4 text-muted-foreground transition-transform group-hover:block",
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
							className="-ml-1 h-6 min-w-0 flex-1 bg-transparent border-none px-1 py-0 text-sm font-medium outline-none"
						/>
					) : (
						<span className="truncate">{projectName}</span>
					)}
				</div>

				{!isRenaming && (
					<div className="ml-1 flex size-6 shrink-0 items-center justify-center">
						{agentStatus === "working" ? (
							<WaveSpinner
								className={cn("text-foreground/80", HIDE_ON_HOVER)}
							/>
						) : agentStatus ? (
							<StatusIndicator status={agentStatus} className={HIDE_ON_HOVER} />
						) : (
							backgroundWork > 0 && (
								<Bot
									role="img"
									aria-label={t({
										message: plural(backgroundWork, {
											one: "# background task running",
											other: "# background tasks running",
										}),
									})}
									className={cn(
										"size-3.5 text-emerald-500/90 motion-safe:animate-pulse",
										HIDE_ON_HOVER,
									)}
								/>
							)
						)}
						<Tooltip delayDuration={500}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										onNewWorkspace();
									}}
									onKeyDown={(event) => event.stopPropagation()}
									onContextMenu={(event) => event.stopPropagation()}
									aria-label={t({
										message: "New workspace",
									})}
									className="hidden size-full items-center justify-center rounded transition-colors hover:bg-fill-hover group-hover:flex group-has-[:focus]:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<HiMiniPlus className="size-4 text-muted-foreground" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<Trans>New workspace</Trans>
							</TooltipContent>
						</Tooltip>
					</div>
				)}
			</div>
		);
	},
);
