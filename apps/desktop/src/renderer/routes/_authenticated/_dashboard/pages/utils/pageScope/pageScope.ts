import type { PageListScope } from "@superset/trpc/page-schema";

/**
 * The tabs. `pinned` is not a server scope: pins live in renderer storage, so
 * the list asks for them by id instead of by a column. `artifacts` lists the
 * Claude artifacts published from this machine, not pages.
 */
export const PAGE_SCOPES = [
	"all",
	"pinned",
	"team",
	"shared",
	"mine",
	"artifacts",
] as const;

export type PageScope = (typeof PAGE_SCOPES)[number];

export function isPageScope(value: unknown): value is PageScope {
	return (PAGE_SCOPES as readonly unknown[]).includes(value);
}

export function serverScope(scope: PageScope): PageListScope {
	return scope === "pinned" || scope === "artifacts" ? "all" : scope;
}
