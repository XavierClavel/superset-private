import { isLocalPathText, pathFileName, stripLocation } from "../pathText";
import { localPathLink, type MarkdownNode } from "../remarkLocalPathLinks";

const WORD = /\S+/g;
const OPENING_PUNCTUATION = /^[("'<[{«“‘]+/;
const CLOSING_PUNCTUATION = /[)"'>\]}»”’.,;:!?]+$/;
const PATH_SEGMENT = /^[\w@%+().-]+$/;
const HOST_NAME = /^[^.].*\./;

function isBarePath(word: string): boolean {
	if (!word.includes("/") || !isLocalPathText(word) || !pathFileName(word)) {
		return false;
	}
	const [first = "", ...rest] = stripLocation(
		word.replace(/^file:\/\//, ""),
	).split("/");
	const root = first === "" || first === "~";
	if (!root && (!PATH_SEGMENT.test(first) || HOST_NAME.test(first))) {
		return false;
	}
	return rest.every((segment) => PATH_SEGMENT.test(segment));
}

function splitBarePaths(text: string): MarkdownNode[] | null {
	const nodes: MarkdownNode[] = [];
	let end = 0;
	for (const match of text.matchAll(WORD)) {
		const lead = match[0].match(OPENING_PUNCTUATION)?.[0].length ?? 0;
		const path = match[0].slice(lead).replace(CLOSING_PUNCTUATION, "");
		if (!isBarePath(path)) continue;
		const start = match.index + lead;
		if (start > end) {
			nodes.push({ type: "text", value: text.slice(end, start) });
		}
		nodes.push(localPathLink(path, path));
		end = start + path.length;
	}
	if (end === 0) return null;
	if (end < text.length) nodes.push({ type: "text", value: text.slice(end) });
	return nodes;
}

function linkBarePaths(node: MarkdownNode) {
	if (node.type === "link" || node.type === "linkReference" || !node.children) {
		return;
	}
	node.children = node.children.flatMap((child) => {
		if (child.type === "text" && child.value) {
			return splitBarePaths(child.value) ?? [child];
		}
		linkBarePaths(child);
		return [child];
	});
}

export function remarkBarePathLinks() {
	return (tree: MarkdownNode) => linkBarePaths(tree);
}
