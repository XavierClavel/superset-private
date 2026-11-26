import { useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { HiOutlineBarsArrowDown } from "react-icons/hi2";
import type {
	SidebarProjectHostFilter,
	SidebarProjectListSortMode,
	SidebarProjectSortMode,
} from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema";

const SORT_MODES: SidebarProjectSortMode[] = ["manual", "active", "created"];
const PROJECT_LIST_SORT_MODES: SidebarProjectListSortMode[] = [
	"manual",
	"name",
];
const HOST_FILTERS: SidebarProjectHostFilter[] = ["all", "local", "cloud"];

interface DashboardSidebarProjectsSortMenuProps {
	sortMode: SidebarProjectSortMode;
	onSortModeChange: (mode: SidebarProjectSortMode) => void;
	projectListSortMode: SidebarProjectListSortMode;
	onProjectListSortModeChange: (mode: SidebarProjectListSortMode) => void;
	/** Null hides the host filter (cloud rows are not inline). */
	hostFilter: SidebarProjectHostFilter | null;
	onHostFilterChange: (filter: SidebarProjectHostFilter) => void;
}

/**
 * Sort picker in the Projects header: one choice orders the projects and
 * their folders, the other the workspaces inside each project. Lives inside
 * the header strip, which toggles the section on click, so the trigger
 * and the (portaled, but React-bubbling) menu content both stop propagation.
 */
export function DashboardSidebarProjectsSortMenu({
	sortMode,
	onSortModeChange,
	projectListSortMode,
	onProjectListSortModeChange,
	hostFilter,
	onHostFilterChange,
}: DashboardSidebarProjectsSortMenuProps) {
	const { t } = useLingui();
	const labels: Record<SidebarProjectSortMode, string> = {
		manual: t({
			message: "Manual order",
		}),
		active: t({
			message: "Last active",
		}),
		created: t({
			message: "Date created",
		}),
	};
	const projectListLabels: Record<SidebarProjectListSortMode, string> = {
		manual: t({
			message: "Manual order",
		}),
		name: t({
			message: "Name (A–Z)",
		}),
	};
	const isCustomized =
		sortMode !== "manual" || projectListSortMode !== "manual";
	const hostLabels: Record<SidebarProjectHostFilter, string> = {
		all: t({
			message: "All workspaces",
		}),
		local: t({
			message: "Local",
		}),
		cloud: t({
			message: "Cloud",
		}),
	};
	const isHostFiltered = hostFilter !== null && hostFilter !== "all";
	const hostLabel = hostFilter === null ? "" : hostLabels[hostFilter];

	return (
		<DropdownMenu>
			<Tooltip delayDuration={700}>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={t({
								message: "Sort projects and workspaces",
							})}
							onClick={(event) => event.stopPropagation()}
							onKeyDown={(event) => event.stopPropagation()}
							className={cn(
								"flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-fill-hover hover:text-foreground",
								// Read as "on" whenever the list is not the plain drag order.
								!isCustomized && !isHostFiltered
									? "text-muted-foreground"
									: "text-foreground",
							)}
						>
							<HiOutlineBarsArrowDown className="size-3.5" />
						</button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					{isHostFiltered
						? t({
								message: `Sort projects and workspaces · ${hostLabel}`,
							})
						: t({
								message: "Sort projects and workspaces",
							})}
				</TooltipContent>
			</Tooltip>
			<DropdownMenuContent
				align="end"
				onCloseAutoFocus={(event) => event.preventDefault()}
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<DropdownMenuLabel className="text-xs font-normal text-muted-foreground/70">
					{t({
						message: "Sort projects by",
					})}
				</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={projectListSortMode}
					onValueChange={(value) =>
						onProjectListSortModeChange(value as SidebarProjectListSortMode)
					}
				>
					{PROJECT_LIST_SORT_MODES.map((mode) => (
						<DropdownMenuRadioItem key={mode} value={mode}>
							{projectListLabels[mode]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-xs font-normal text-muted-foreground/70">
					{t({
						message: "Sort workspaces by",
					})}
				</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={sortMode}
					onValueChange={(value) =>
						onSortModeChange(value as SidebarProjectSortMode)
					}
				>
					{SORT_MODES.map((mode) => (
						<DropdownMenuRadioItem key={mode} value={mode}>
							{labels[mode]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				{sortMode !== "manual" && (
					<div className="px-2 pb-1 pt-1.5 text-[11px] text-muted-foreground/70">
						{t({
							message: "Drag workspaces to reorder in Manual order",
						})}
					</div>
				)}
				{hostFilter !== null && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-xs font-normal text-muted-foreground/70">
							{t({
								message: "Show",
							})}
						</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={hostFilter}
							onValueChange={(value) =>
								onHostFilterChange(value as SidebarProjectHostFilter)
							}
						>
							{HOST_FILTERS.map((filter) => (
								<DropdownMenuRadioItem key={filter} value={filter}>
									{hostLabels[filter]}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
