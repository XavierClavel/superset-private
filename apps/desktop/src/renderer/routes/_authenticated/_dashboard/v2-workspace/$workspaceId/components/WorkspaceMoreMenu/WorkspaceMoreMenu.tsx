import { useLingui } from "@lingui/react/macro";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { Ellipsis } from "lucide-react";
import { useWorkspaceOpenIn } from "../../hooks/useWorkspaceOpenIn";
import { useWorkspaceOpenInTarget } from "../../hooks/useWorkspaceOpenInTarget";
import { WorkspaceOpenInItems } from "./components/WorkspaceOpenInItems";

interface WorkspaceMoreMenuProps {
	workspaceId: string;
	projectId: string | null;
}

/**
 * The toolbar's "…" menu. It holds the "Open in" targets; the run command
 * has its own button beside it (WorkspaceToolbar), so with nothing to open
 * the menu is not shown.
 */
export function WorkspaceMoreMenu({
	workspaceId,
	projectId,
}: WorkspaceMoreMenuProps) {
	const { t } = useLingui();
	const openInTarget = useWorkspaceOpenInTarget(workspaceId);
	const openIn = useWorkspaceOpenIn({
		worktreePath: openInTarget?.worktreePath ?? null,
		projectId,
	});
	const label = t({ message: "More actions" });

	if (!openInTarget) return null;

	return (
		<DropdownMenu>
			<Tooltip delayDuration={500}>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={label}
							className="no-drag flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground aria-expanded:bg-foreground/15 aria-expanded:text-foreground aria-expanded:hover:bg-foreground/20"
						>
							<Ellipsis className="size-4" strokeWidth={1.5} />
						</button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">{label}</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="min-w-56">
				<WorkspaceOpenInItems openIn={openIn} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
