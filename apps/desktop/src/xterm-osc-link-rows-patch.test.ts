import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ILink, ILinkProvider } from "@xterm/xterm";

// Guards the OscLinkProvider hunk of the bun patch on @xterm/xterm
// (patches/README.md). patchedDependencies is keyed to an exact version, so a
// bump silently drops the patch while everything still builds. If this fails
// after a bump, regenerate the patch per patches/README.md; do NOT delete it.

const { Terminal } = await import("@xterm/xterm");

const COLS = 20;

function osc8(id: string, uri: string, text: string) {
	return `\x1b]8;id=${id};${uri}\x07${text}\x1b]8;;\x07`;
}

async function linksOnFirstTwoRows(data: string) {
	const terminal = new Terminal({ cols: COLS, rows: 5 });
	await new Promise<void>((resolve) => terminal.write(data, resolve));
	const oscProvider = (
		terminal as unknown as {
			_core: { _linkProviderService: { linkProviders: ILinkProvider[] } };
		}
	)._core._linkProviderService.linkProviders[0];
	const rows = await Promise.all(
		[1, 2].map(
			(y) =>
				new Promise<ILink[]>((resolve) =>
					oscProvider.provideLinks(y, (links) => resolve(links ?? [])),
				),
		),
	);
	terminal.dispose();
	return rows.map((links) => links.map(({ text, range }) => ({ text, range })));
}

describe("@xterm/xterm OSC 8 links across hard-broken rows patch", () => {
	const libDir = dirname(require.resolve("@xterm/xterm"));
	for (const name of ["xterm.js", "xterm.mjs"] as const) {
		test(`${name} carries the patch`, () => {
			const src = readFileSync(join(libDir, name), "utf8");
			expect(src).toContain("_firstNonBlank(h,c)");
			expect(src).toContain("_lastNonBlank(h,c)+1");
		});
	}

	test("one link spans a row the program broke and its indented continuation", async () => {
		const uri = "https://e.com/abcdefgh";
		const link = {
			text: uri,
			range: { start: { x: 3, y: 1 }, end: { x: 6, y: 2 } },
		};
		const rows = await linksOnFirstTwoRows(
			`  ${osc8("a", uri, "https://e.com/abcd")}\r\n  ${osc8("a", uri, "efgh")}`,
		);
		expect(rows).toEqual([[link], [link]]);
	});

	test("a different link on the next row stays separate", async () => {
		const rows = await linksOnFirstTwoRows(
			`  ${osc8("a", "https://e.com/abcd", "https://e.com/abcd")}\r\n  ${osc8("b", "https://e.com/two", "https://e.com/two")}`,
		);
		expect(rows).toEqual([
			[
				{
					text: "https://e.com/abcd",
					range: { start: { x: 3, y: 1 }, end: { x: 20, y: 1 } },
				},
			],
			[
				{
					text: "https://e.com/two",
					range: { start: { x: 3, y: 2 }, end: { x: 19, y: 2 } },
				},
			],
		]);
	});
});
