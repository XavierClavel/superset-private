import { useCallback, useEffect, useRef, useState } from "react";
import { SidebarNavList } from "../SidebarNavList";
import { SidebarNavIconRow } from "./components/SidebarNavIconRow";

const UNFOLD_DELAY_MS = 500;

export function SidebarNavPeek() {
	const [isUnfolded, setIsUnfolded] = useState(false);
	const unfoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const cancelUnfold = useCallback(() => {
		if (unfoldTimerRef.current === null) return;
		clearTimeout(unfoldTimerRef.current);
		unfoldTimerRef.current = null;
	}, []);

	useEffect(() => cancelUnfold, [cancelUnfold]);

	const scheduleUnfold = useCallback(() => {
		cancelUnfold();
		unfoldTimerRef.current = setTimeout(() => {
			unfoldTimerRef.current = null;
			setIsUnfolded(true);
		}, UNFOLD_DELAY_MS);
	}, [cancelUnfold]);

	const fold = useCallback(() => {
		cancelUnfold();
		setIsUnfolded(false);
	}, [cancelUnfold]);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: folds the hover menu when the pointer leaves it
		<div className="relative" onMouseLeave={fold}>
			<SidebarNavIconRow onMouseEnter={scheduleUnfold} onActivate={fold} />
			{isUnfolded && (
				// pt-1 instead of a margin: the gap stays inside the hover area.
				<div className="absolute -inset-x-1 top-full z-30 pt-1" onClick={fold}>
					<div className="flex flex-col gap-px rounded-md border border-border bg-popover p-1 shadow-lg">
						<SidebarNavList />
					</div>
				</div>
			)}
		</div>
	);
}
