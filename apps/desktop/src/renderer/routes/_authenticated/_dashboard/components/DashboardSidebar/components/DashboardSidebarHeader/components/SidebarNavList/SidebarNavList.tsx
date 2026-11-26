import { Trans, useLingui } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import { GoGitPullRequest } from "react-icons/go";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { LuClock, LuFileText, LuGauge, LuPuzzle } from "react-icons/lu";
import { TbStack2 } from "react-icons/tb";
import { useDashboardNavigation } from "renderer/routes/_authenticated/_dashboard/hooks/useDashboardNavigation";
import { useFailedAutomations } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";
import { SidebarNewWorkspaceButton } from "../../../SidebarNewWorkspaceButton";
import { SidebarSearchButton } from "../../../SidebarSearchButton";
import { useSidebarNavVisibility } from "../../hooks/useSidebarNavVisibility";

export function SidebarNavList() {
	const { t } = useLingui();
	const navigation = useDashboardNavigation();
	const { myFailedCount } = useFailedAutomations();
	const { isPluginsEnabled, isUsageInSidebarEnabled } =
		useSidebarNavVisibility();

	return (
		<>
			<SidebarNewWorkspaceButton />
			<SidebarSearchButton />

			<button
				type="button"
				onClick={navigation.openWorkspaces}
				className={cn(
					"flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors",
					navigation.isWorkspacesOpen
						? "bg-fill-selected text-foreground"
						: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
				)}
			>
				<TbStack2
					className="size-4 shrink-0 text-muted-foreground"
					strokeWidth={1.5}
				/>
				<span className="flex-1 text-left">
					<Trans>Workspaces</Trans>
				</span>
			</button>

			<div className="relative">
				<button
					type="button"
					onClick={navigation.openAutomations}
					className={cn(
						"flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors",
						navigation.isAutomationsOpen
							? "bg-fill-selected text-foreground"
							: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
					)}
				>
					<LuClock
						className="size-4 shrink-0 text-muted-foreground"
						strokeWidth={1.5}
					/>
					<span className="flex-1 text-left">
						<Trans>Automations</Trans>
					</span>
				</button>
				{myFailedCount > 0 && (
					<button
						type="button"
						onClick={navigation.openFailedAutomations}
						title={t({
							message: `${myFailedCount} of your automations failed their last run`,
						})}
						className="absolute right-2 top-1/2 flex h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full bg-red-500/15 px-1 text-[10px] font-medium tabular-nums text-red-600 transition-colors hover:bg-red-500/25 dark:text-red-400"
					>
						{myFailedCount > 9 ? "9+" : myFailedCount}
					</button>
				)}
			</div>

			<button
				type="button"
				onClick={navigation.openTasks}
				aria-label={t({
					message: "Tasks",
				})}
				aria-current={navigation.isTasksOpen ? "page" : undefined}
				className={cn(
					"flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors",
					navigation.isTasksOpen
						? "bg-fill-selected text-foreground"
						: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
				)}
			>
				<HiOutlineClipboardDocumentList className="size-4 shrink-0 text-muted-foreground" />
				<span className="flex-1 text-left">
					<Trans>Tasks</Trans>
				</span>
			</button>

			<button
				type="button"
				onClick={navigation.openPullRequests}
				aria-label={t({
					message: "Pull requests",
				})}
				aria-current={navigation.isPullRequestsOpen ? "page" : undefined}
				className={cn(
					"flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors",
					navigation.isPullRequestsOpen
						? "bg-fill-selected text-foreground"
						: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
				)}
			>
				<GoGitPullRequest className="size-4 shrink-0 text-muted-foreground" />
				<span className="flex-1 text-left">
					<Trans>Pull requests</Trans>
				</span>
			</button>

			{isUsageInSidebarEnabled && (
				<button
					type="button"
					onClick={navigation.openUsage}
					aria-label={t({
						message: "Usage",
					})}
					className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground"
				>
					<LuGauge
						className="size-4 shrink-0 text-muted-foreground"
						strokeWidth={1.5}
					/>
					<span className="flex-1 text-left">
						<Trans>Usage</Trans>
					</span>
				</button>
			)}

			<button
				type="button"
				onClick={navigation.openPages}
				aria-label={t({
					message: "Pages",
				})}
				aria-current={navigation.isPagesOpen ? "page" : undefined}
				className={cn(
					"flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors",
					navigation.isPagesOpen
						? "bg-fill-selected text-foreground"
						: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
				)}
			>
				<LuFileText
					className="size-4 shrink-0 text-muted-foreground"
					strokeWidth={1.5}
				/>
				<span className="flex-1 text-left">
					<Trans>Pages</Trans>
				</span>
			</button>

			{isPluginsEnabled && (
				<button
					type="button"
					onClick={navigation.openPlugins}
					aria-label={t({
						message: "Plugins",
					})}
					aria-current={navigation.isPluginsOpen ? "page" : undefined}
					className={cn(
						"flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors",
						navigation.isPluginsOpen
							? "bg-fill-selected text-foreground"
							: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
					)}
				>
					<LuPuzzle
						className="size-4 shrink-0 text-muted-foreground"
						strokeWidth={1.5}
					/>
					<span className="flex-1 text-left">
						<Trans>Plugins</Trans>
					</span>
				</button>
			)}
		</>
	);
}
