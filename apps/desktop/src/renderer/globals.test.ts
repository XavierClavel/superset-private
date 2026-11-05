import { describe, expect, test } from "bun:test";

const CSS = (
	await Bun.file(new URL("./globals.css", import.meta.url)).text()
).replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the rule whose selector list matches `selector`. */
function declarations(selector: string): string {
	const rule = CSS.match(
		new RegExp(`(?:^|[}\\s])${selector}\\s*\\{([^}]*)\\}`),
	);
	if (!rule?.[1]) throw new Error(`no "${selector}" rule in globals.css`);
	return rule[1];
}

// Chromium reports a window-drag region at each element's full size, ignoring
// scroll clipping, and later elements win. An inherited `no-drag` therefore
// lets any scrolled-out row switch off the drag strip above it.
describe("window-drag regions", () => {
	test("elements inside the app report none unless marked", () => {
		// `none` computes to `no-drag` in Chromium; `initial` is what resets it.
		expect(declarations("app")).toMatch(/-webkit-app-region:\s*initial;/);
	});

	test("overlays portaled to body stay clickable over drag strips", () => {
		expect(declarations("html,\\s*body")).toMatch(
			/-webkit-app-region:\s*no-drag;/,
		);
	});
});
