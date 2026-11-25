import fs from "node:fs/promises";
import path from "node:path";
import { resolveAppHomeDir } from "./paths";

/** Written by notify-hook.template.sh too: keep the folder name in sync. */
export const CLAUDE_ARTIFACTS_DIR_NAME = "claude-artifacts";

const CLAUDE_ARTIFACT_URL = /^https:\/\/claude\.ai\/(code\/)?artifact\/[\w-]+$/;

export interface ClaudeArtifact {
	url: string;
	title: string | null;
	description: string | null;
	workspaceId: string | null;
	publishedAt: number;
}

export function getClaudeArtifactsDir(
	homeDir: string = resolveAppHomeDir(),
): string {
	return path.join(homeDir, CLAUDE_ARTIFACTS_DIR_NAME);
}

function optionalString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value : null;
}

async function readClaudeArtifact(
	file: string,
): Promise<ClaudeArtifact | null> {
	try {
		const [content, stats] = await Promise.all([
			fs.readFile(file, "utf-8"),
			fs.stat(file),
		]);
		const record = JSON.parse(content) as Record<string, unknown>;
		if (typeof record.url !== "string" || !CLAUDE_ARTIFACT_URL.test(record.url))
			return null;
		return {
			url: record.url,
			title: optionalString(record.title),
			description: optionalString(record.description),
			workspaceId: optionalString(record.workspaceId),
			publishedAt: stats.mtimeMs,
		};
	} catch {
		return null;
	}
}

/** The artifacts agents published from this machine's terminals, last published first. */
export async function listClaudeArtifacts(
	homeDir: string = resolveAppHomeDir(),
): Promise<ClaudeArtifact[]> {
	const dir = getClaudeArtifactsDir(homeDir);
	const names = await fs.readdir(dir).catch(() => []);
	const artifacts = await Promise.all(
		names
			.filter((name) => name.endsWith(".json"))
			.map((name) => readClaudeArtifact(path.join(dir, name))),
	);
	return artifacts
		.filter((artifact) => artifact !== null)
		.sort((a, b) => b.publishedAt - a.publishedAt);
}
