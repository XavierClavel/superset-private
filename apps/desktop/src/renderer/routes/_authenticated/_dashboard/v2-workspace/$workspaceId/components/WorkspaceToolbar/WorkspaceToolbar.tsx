import { RightSidebarToggle } from "renderer/routes/_authenticated/_dashboard/components/RightSidebarToggle";
import { WindowControlsInset } from "renderer/routes/_authenticated/_dashboard/components/WindowControlsInset";
import { useWorkspace } from "../../../providers/WorkspaceProvider";
import type { useV2WorkspaceRun } from "../../hooks/useV2WorkspaceRun";
import { V2WorkspaceRunButton } from "../V2WorkspaceRunButton";
import { WorkspaceMoreMenu } from "../WorkspaceMoreMenu";

interface WorkspaceToolbarProps {
	run: ReturnType<typeof useV2WorkspaceRun>;
	isRightPaneOpen: boolean;
	onToggleRightPane: () => void;
	showWindowControls: boolean;
}

export function WorkspaceToolbar({
	run,
	isRightPaneOpen,
	onToggleRightPane,
	showWindowControls,
}: WorkspaceToolbarProps) {
	const { workspace } = useWorkspace();

	return (
		<>
			<V2WorkspaceRunButton
				projectId={workspace.projectId}
				definition={run.definition}
				isRunning={run.isRunning}
				isPending={run.isPending}
				canForceStop={run.canForceStop}
				onToggle={run.toggleWorkspaceRun}
				onForceStop={run.forceStopWorkspaceRun}
				iconOnly
			/>
			<WorkspaceMoreMenu
				workspaceId={workspace.id}
				projectId={workspace.projectId}
			/>
			<RightSidebarToggle
				compact
				isOpen={isRightPaneOpen}
				onToggle={onToggleRightPane}
			/>
			{showWindowControls && <WindowControlsInset />}
		</>
	);
}
