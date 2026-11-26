import { useDroppable } from "@dnd-kit/core";
import { cn } from "@superset/ui/utils";
import { useDashboardSidebarDnd } from "../../../../hooks/useSidebarDnd";
import { useProjectTreeRowDropIndicator } from "../../../../stores/projectTreeDropIndicator";
import { PROJECT_TREE_END_ID } from "../../../../utils/resolveProjectTreeDrop";
import { ProjectTreeDropLine } from "../ProjectTreeDropLine";

/**
 * The space below the project list. Dropping a project or folder here puts it
 * last at the top level, which no row can offer when the last item is an open
 * folder.
 */
export function ProjectTreeEndDropZone() {
	const { activeType } = useDashboardSidebarDnd();
	const isTreeDrag = activeType === "project" || activeType === "folder";
	const { setNodeRef } = useDroppable({
		id: PROJECT_TREE_END_ID,
		disabled: !isTreeDrag,
	});
	const dropIndicator = useProjectTreeRowDropIndicator(PROJECT_TREE_END_ID);

	return (
		<div
			ref={setNodeRef}
			aria-hidden
			className={cn("relative", isTreeDrag ? "h-8" : "h-0")}
		>
			{dropIndicator === "before" && <ProjectTreeDropLine edge="before" />}
		</div>
	);
}
