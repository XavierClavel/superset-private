import { afterEach, expect, jest, test } from "bun:test";
import { formatTimer } from "@superset/i18n/format";
import { act, cleanup, render, screen } from "@testing-library/react";
import { BackgroundWorkList } from "./BackgroundWorkList";

afterEach(() => {
	cleanup();
	jest.useRealTimers();
});

test("each task shows a timer that ticks every second", () => {
	jest.useFakeTimers();
	const now = Date.now();
	const work = [
		{ description: "Start the dev server", startedAtMs: now - 90 * 60_000 },
		{ description: "Review the diff", startedAtMs: now - 201_000 },
	];
	render(<BackgroundWorkList work={work} />);

	const expectTimersAt = (at: number) => {
		for (const { description, startedAtMs } of work) {
			expect(screen.getByText(description).parentElement?.textContent).toBe(
				`${description}${formatTimer(startedAtMs, at)}`,
			);
		}
	};
	expectTimersAt(now);
	act(() => jest.advanceTimersByTime(1000));
	expectTimersAt(now + 1000);
});
