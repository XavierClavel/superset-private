import { expect, test } from "bun:test";
import { ChatMarkdown } from "@superset/chat-ui/ChatMarkdown";
import { renderToStaticMarkup } from "react-dom/server";
import {
	LOCAL_PATH_PREFIX,
	remarkLocalPathLinks,
} from "../remarkLocalPathLinks";
import { remarkBarePathLinks } from "./remarkBarePathLinks";

function localPaths(markdown: string): string[] {
	const html = renderToStaticMarkup(
		<ChatMarkdown remarkPlugins={[remarkLocalPathLinks, remarkBarePathLinks]}>
			{markdown}
		</ChatMarkdown>,
	);
	return [...html.matchAll(/href="([^"]*)"/g)]
		.map((match) => match[1] ?? "")
		.filter((href) => href.startsWith(LOCAL_PATH_PREFIX))
		.map((href) => decodeURIComponent(href.slice(LOCAL_PATH_PREFIX.length)));
}

test("paths written in prose become file links", () => {
	expect(
		localPaths(
			"Saved /Users/me/shot.png, see (src/app.ts:12) and ~/notes/a.md. Also ./b.ts, **../c.tsx** and file:///tmp/d.png!",
		),
	).toEqual([
		"/Users/me/shot.png",
		"src/app.ts:12",
		"~/notes/a.md",
		"./b.ts",
		"../c.tsx",
		"file:///tmp/d.png",
	]);
});

test("prose that only looks like a path stays text", () => {
	expect(
		localPaths(
			"and/or TCP/IP 3/4 v1.2/v1.3 example.com/logo.png //cdn/x.js app.ts src/ `src/app.ts` https://a.co/c.png",
		),
	).toEqual([]);
});

test("a path that is already a link is linked once", () => {
	expect(localPaths("[src/a.ts](src/a.ts) and [see](/tmp/b.png)")).toEqual([
		"src/a.ts",
		"/tmp/b.png",
	]);
});
