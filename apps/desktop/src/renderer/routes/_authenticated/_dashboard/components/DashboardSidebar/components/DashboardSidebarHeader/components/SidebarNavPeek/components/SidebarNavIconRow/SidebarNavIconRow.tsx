import { useLingui } from "@lingui/react/macro";
import { cn } from "@superset/ui/utils";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { GoGitPullRequest } from "react-icons/go";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import {
	LuClock,
	LuFileText,
	LuGauge,
	LuPlus,
	LuPuzzle,
	LuSearch,
} from "react-icons/lu";
import { TbStack2 } from "react-icons/tb";
import { useDashboardNavigation } from "renderer/routes/_authenticated/_dashboard/hooks/useDashboardNavigation";
import { useFailedAutomations } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";
import { useOpenNewWorkspaceInViewedProject } from "renderer/routes/_authenticated/_dashboard/hooks/useOpenNewWorkspaceInViewedProject";
import { STROKE_WIDTH_THICK } from "renderer/screens/main/components/WorkspaceSidebar/constants";
import { useCommandPaletteToggle } from "../../../../../../hooks/useCommandPaletteToggle";
import { useSidebarNavVisibility } from "../../../../hooks/useSidebarNavVisibility";

interface SidebarNavIconRowProps {
	onMouseEnter: () => void;
	onActivate: () => void;
}

interface IconButtonProps {
	label: string;
	isActive?: boolean;
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
	onPointerDown?: () => void;
	icon: ComponentType<{ className?: string; strokeWidth?: number }>;
	children?: ReactNode;
}

function IconButton({
	label,
	isActive = false,
	onClick,
	onPointerDown,
	icon: Icon,
	children,
}: IconButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-current={isActive ? "page" : undefined}
			onPointerDown={onPointerDown}
			onClick={onClick}
			className={cn(
				"relative flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
				isActive ? "bg-fill-selected" : "hover:bg-fill-hover",
			)}
		>
			<Icon className="size-4" strokeWidth={1.5} />
			{children}
		</button>
	);
}

export function SidebarNavIconRow({
	onMouseEnter,
	onActivate,
}: SidebarNavIconRowProps) {
	const { t } = useLingui();
	const navigation = useDashboardNavigation();
	const openNewWorkspace = useOpenNewWorkspaceInViewedProject();
	const paletteToggle = useCommandPaletteToggle();
	const { myFailedCount } = useFailedAutomations();
	const { isPluginsEnabled, isUsageInSidebarEnabled } =
		useSidebarNavVisibility();

	const activate =
		(action: (event: MouseEvent<HTMLButtonElement>) => void) =>
		(event: MouseEvent<HTMLButtonElement>) => {
			onActivate();
			action(event);
		};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: hover only unfolds the menu; each button stays reachable by keyboard
		<div
			className="flex flex-wrap items-center gap-0.5"
			onMouseEnter={onMouseEnter}
		>
			<button
				type="button"
				aria-label={t({ message: "New Workspace" })}
				onClick={activate(() => openNewWorkspace())}
				className="flex size-7 shrink-0 items-center justify-center rounded-md bg-fill-hover/60 [.light_&]:bg-fill-hover text-muted-foreground transition-colors hover:bg-fill-selected [.light_&]:hover:bg-fill-selected"
			>
				<div className="flex size-5 items-center justify-center rounded bg-fill-selected">
					<LuPlus className="size-3" strokeWidth={STROKE_WIDTH_THICK} />
				</div>
			</button>
			<IconButton
				label={t({ message: "Search" })}
				icon={LuSearch}
				onPointerDown={paletteToggle.onPointerDown}
				onClick={activate(paletteToggle.onClick)}
			/>
			<IconButton
				label={t({ message: "Workspaces" })}
				icon={TbStack2}
				isActive={navigation.isWorkspacesOpen}
				onClick={activate(navigation.openWorkspaces)}
			/>
			<IconButton
				label={t({ message: "Automations" })}
				icon={LuClock}
				isActive={navigation.isAutomationsOpen}
				onClick={activate(navigation.openAutomations)}
			>
				{myFailedCount > 0 && (
					<span
						aria-hidden="true"
						className="absolute right-1 top-1 size-1.5 rounded-full bg-red-500"
					/>
				)}
			</IconButton>
			<IconButton
				label={t({ message: "Tasks" })}
				icon={HiOutlineClipboardDocumentList}
				isActive={navigation.isTasksOpen}
				onClick={activate(navigation.openTasks)}
			/>
			<IconButton
				label={t({ message: "Pull requests" })}
				icon={GoGitPullRequest}
				isActive={navigation.isPullRequestsOpen}
				onClick={activate(navigation.openPullRequests)}
			/>
			{isUsageInSidebarEnabled && (
				<IconButton
					label={t({ message: "Usage" })}
					icon={LuGauge}
					onClick={activate(navigation.openUsage)}
				/>
			)}
			<IconButton
				label={t({ message: "Pages" })}
				icon={LuFileText}
				isActive={navigation.isPagesOpen}
				onClick={activate(navigation.openPages)}
			/>
			{isPluginsEnabled && (
				<IconButton
					label={t({ message: "Plugins" })}
					icon={LuPuzzle}
					isActive={navigation.isPluginsOpen}
					onClick={activate(navigation.openPlugins)}
				/>
			)}
		</div>
	);
}
