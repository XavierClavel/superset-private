export const LOCAL_PATH_PREFIX = "/__superset_local_path__/";

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d+(?::\d+)?$)/i;

export interface MarkdownNode {
	type: string;
	url?: string;
	alt?: string | null;
	value?: string;
	children?: MarkdownNode[];
}

function isLocalUrl(url: string): boolean {
	return (
		!url.startsWith("#") && (url.startsWith("file://") || !URL_SCHEME.test(url))
	);
}

export function localPathLink(path: string, label: string): MarkdownNode {
	return {
		type: "link",
		url: LOCAL_PATH_PREFIX + encodeURIComponent(path),
		children: [{ type: "text", value: label }],
	};
}

function rewriteLocalPaths(node: MarkdownNode) {
	if (node.type === "link" && node.url && isLocalUrl(node.url)) {
		node.url = LOCAL_PATH_PREFIX + encodeURIComponent(node.url);
	}
	if (!node.children) return;
	node.children = node.children.map((child) => {
		if (
			child.type === "image" &&
			child.url &&
			isLocalUrl(child.url) &&
			node.type !== "link"
		) {
			return localPathLink(child.url, child.alt || child.url);
		}
		rewriteLocalPaths(child);
		return child;
	});
}

export function remarkLocalPathLinks() {
	return (tree: MarkdownNode) => rewriteLocalPaths(tree);
}
