import { cn } from "../../lib/utils";

const STEP_MS = 150;
const CLOCKWISE_RING = [
	{ row: 1, column: 1 },
	{ row: 1, column: 2 },
	{ row: 1, column: 3 },
	{ row: 2, column: 3 },
	{ row: 3, column: 3 },
	{ row: 3, column: 2 },
	{ row: 3, column: 1 },
	{ row: 2, column: 1 },
];

interface LoopSpinnerProps {
	className?: string;
}

export function LoopSpinner({ className }: LoopSpinnerProps) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"grid size-[11px] shrink-0 grid-cols-[repeat(3,3px)] grid-rows-[repeat(3,3px)] gap-px",
				className,
			)}
		>
			{CLOCKWISE_RING.map((cell, index) => (
				<span
					key={`${cell.row}-${cell.column}`}
					className="animate-loop-cell rounded-[0.5px] bg-current"
					style={{
						gridRow: cell.row,
						gridColumn: cell.column,
						animationDelay: `${(index - CLOCKWISE_RING.length) * STEP_MS}ms`,
					}}
				/>
			))}
		</span>
	);
}
