import { cn } from "@superset/ui/utils";

interface ProjectTreeDropLineProps {
	edge: "before" | "after";
}

/** Marks where a dragged project or folder lands, above or below a row. */
export function ProjectTreeDropLine({ edge }: ProjectTreeDropLineProps) {
	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none absolute inset-x-3 z-10 h-0.5 rounded-full bg-primary",
				edge === "before" ? "-top-px" : "-bottom-px",
			)}
		/>
	);
}
