import { cn } from "@superset/ui/utils";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import type { WorkspaceLabel } from "renderer/hooks/workspace-labels/useWorkspaceLabels";
import { toPastelColor } from "./toPastelColor";

interface WorkspaceLabelPillProps
	extends Omit<ComponentPropsWithoutRef<"button">, "onClick" | "style"> {
	label: WorkspaceLabel;
	isActive?: boolean;
	size?: "sm" | "xs";
	onClick?: () => void;
}

export const WorkspaceLabelPill = forwardRef<
	HTMLButtonElement,
	WorkspaceLabelPillProps
>(function WorkspaceLabelPill(
	{ label, isActive = false, size = "sm", onClick, className, ...props },
	ref,
) {
	const rootClassName = cn(
		"inline-flex min-w-0 max-w-full shrink-0 items-center rounded-full font-medium leading-none text-black",
		size === "sm" ? "h-5 px-2 text-[11px]" : "h-4 px-1.5 text-[10px]",
		isActive && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
		onClick && "cursor-pointer",
		className,
	);
	const style = { backgroundColor: toPastelColor(label.color) };

	if (!onClick) {
		return (
			<span
				{...(props as ComponentPropsWithoutRef<"span">)}
				ref={ref as React.Ref<HTMLSpanElement>}
				className={rootClassName}
				style={style}
			>
				<span className="truncate">{label.name}</span>
			</span>
		);
	}

	return (
		<button
			type="button"
			{...props}
			ref={ref}
			aria-pressed={isActive}
			className={rootClassName}
			style={style}
			onClick={(event) => {
				event.stopPropagation();
				onClick();
			}}
		>
			<span className="truncate">{label.name}</span>
		</button>
	);
});
