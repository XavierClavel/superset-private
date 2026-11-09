import { expect, test } from "bun:test";
import { ChatMarkdown } from "@superset/chat-ui/ChatMarkdown";
import { renderToStaticMarkup } from "react-dom/server";
import {
	LOCAL_PATH_PREFIX,
	remarkLocalPathLinks,
} from "./remarkLocalPathLinks";

function render(markdown: string): string {
	return renderToStaticMarkup(
		<ChatMarkdown remarkPlugins={[remarkLocalPathLinks]}>
			{markdown}
		</ChatMarkdown>,
	);
}

function hrefs(markdown: string): string[] {
	return [...render(markdown).matchAll(/href="([^"]*)"/g)].map(
		(match) => match[1] ?? "",
	);
}

function localPaths(markdown: string): string[] {
	return hrefs(markdown)
		.filter((href) => href.startsWith(LOCAL_PATH_PREFIX))
		.map((href) => decodeURIComponent(href.slice(LOCAL_PATH_PREFIX.length)));
}

test("a local image becomes a link to its file, a web image stays an image", () => {
	const markdown =
		"![Screenshot](/tmp/shot.png) ![](rel/b.jpg) ![web](https://a.co/c.png)";
	const html = render(markdown);
	expect(localPaths(markdown)).toEqual(["/tmp/shot.png", "rel/b.jpg"]);
	expect(
		[...html.matchAll(/<img [^>]*src="([^"]*)"/g)].map((match) => match[1]),
	).toEqual(["https://a.co/c.png"]);
	expect(html).toContain(">Screenshot</a>");
});

test("relative and absolute file links survive the markdown hardening", () => {
	expect(
		hrefs(
			"[a](src/app.ts:12) [b](/Users/me/x.ts#L3) [c](.git/) [d](package.json:4) [e](file:///tmp/a.ts)",
		).map((href) => decodeURIComponent(href.slice(LOCAL_PATH_PREFIX.length))),
	).toEqual([
		"src/app.ts:12",
		"/Users/me/x.ts#L3",
		".git/",
		"package.json:4",
		"file:///tmp/a.ts",
	]);
});

test("web links are left as they are", () => {
	expect(hrefs("[site](https://example.com/a) [mail](mailto:a@b.co)")).toEqual([
		"https://example.com/a",
		"mailto:a@b.co",
	]);
});

test("links with other schemes stay blocked", () => {
	expect(hrefs("[v](vscode://file/x.ts) [s](slack://open)")).toEqual([]);
});
