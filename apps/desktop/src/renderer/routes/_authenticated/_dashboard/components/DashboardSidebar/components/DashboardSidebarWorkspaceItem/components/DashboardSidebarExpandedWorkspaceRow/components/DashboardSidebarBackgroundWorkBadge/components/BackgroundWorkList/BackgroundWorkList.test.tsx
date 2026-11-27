import { afterEach, expect, test } from "bun:test";
import { formatAge } from "@superset/i18n/format";
import { cleanup, render, screen } from "@testing-library/react";
import { BackgroundWorkList } from "./BackgroundWorkList";

afterEach(cleanup);

test("each task shows how long it has been running", () => {
	const now = Date.now();
	const work = [
		{ description: "Start the dev server", startedAtMs: now - 90 * 60_000 },
		{ description: "Review the diff", startedAtMs: now - 330_000 },
	];
	render(<BackgroundWorkList work={work} />);

	for (const { description, startedAtMs } of work) {
		expect(screen.getByText(description).parentElement?.textContent).toBe(
			`${description}${formatAge(startedAtMs, now)}`,
		);
	}
});
