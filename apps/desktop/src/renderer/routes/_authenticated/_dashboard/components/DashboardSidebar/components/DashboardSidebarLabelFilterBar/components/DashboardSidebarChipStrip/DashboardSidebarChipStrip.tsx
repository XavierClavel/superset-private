import { OverflowFadeContainer } from "@superset/ui/overflow-fade-container";
import { cn } from "@superset/ui/utils";
import {
	Children,
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { splitIntoTwoRows } from "./utils/splitIntoTwoRows";

/** Must match the `gap-1.5` classes below. */
const CHIP_GAP_PX = 6;

interface DashboardSidebarChipStripProps {
	className?: string;
	children: ReactNode;
}

/**
 * Strip of chips that stays a single row while everything fits, splits into
 * two packed rows of balanced width once it doesn't, and scrolls
 * horizontally beyond that.
 *
 * Layout is chosen by comparing the chips' natural widths against the
 * container, re-measured on every render and on container resizes. Pure-CSS
 * child growth (e.g. a chip revealing hover actions) deliberately doesn't
 * trigger a re-measure, so hovering can't flip the layout.
 */
export function DashboardSidebarChipStrip({
	className,
	children,
}: DashboardSidebarChipStripProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [secondRowStart, setSecondRowStart] = useState<number | null>(null);
	const chips = Children.toArray(children);

	const measure = useCallback(() => {
		const node = containerRef.current;
		if (!node) return;
		const styles = getComputedStyle(node);
		const available =
			node.clientWidth -
			Number.parseFloat(styles.paddingLeft) -
			Number.parseFloat(styles.paddingRight);
		const rows = node.querySelectorAll<HTMLElement>(":scope > [data-chip-row]");
		const chipNodes = Array.from(
			rows.length > 0 ? rows : [node],
			(row) => Array.from(row.children) as HTMLElement[],
		).flat();
		const widths = chipNodes.map((chip) => chip.offsetWidth);
		const needed =
			widths.reduce((sum, width) => sum + width, 0) +
			CHIP_GAP_PX * (widths.length - 1);
		setSecondRowStart(
			needed > available && widths.length > 1
				? splitIntoTwoRows(widths, CHIP_GAP_PX)
				: null,
		);
	}, []);

	// No dependency array: chips mounting/unmounting re-renders this component,
	// and re-measuring is cheap (setState bails when the value is unchanged).
	useLayoutEffect(measure);

	useLayoutEffect(() => {
		const node = containerRef.current;
		if (!node) return;
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, [measure]);

	const isTwoRows = secondRowStart !== null && secondRowStart < chips.length;

	return (
		<OverflowFadeContainer
			ref={containerRef}
			observeChildren
			className={cn(
				isTwoRows ? "flex flex-col gap-1.5" : "flex items-center gap-1.5",
				"overflow-x-auto hide-scrollbar",
				className,
			)}
		>
			{isTwoRows
				? [chips.slice(0, secondRowStart), chips.slice(secondRowStart)].map(
						(row, index) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: the two rows are fixed positions
								key={index}
								data-chip-row
								className="flex w-max items-center gap-1.5"
							>
								{row}
							</div>
						),
					)
				: chips}
		</OverflowFadeContainer>
	);
}
