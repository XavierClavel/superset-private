import { readdir, readFile, stat } from "node:fs/promises";
import { join, sep } from "node:path";

const PUSH_REFLOG_MESSAGE = "update by push";

/** Branches pushed to `remoteName` since `since` (epoch ms), from the reflogs of its remote-tracking refs. */
export async function readPushedBranches(
	repoPath: string,
	remoteName: string,
	since: number,
): Promise<string[]> {
	const logDir = join(repoPath, ".git", "logs", "refs", "remotes", remoteName);
	let entries: string[];
	try {
		entries = await readdir(logDir, { recursive: true });
	} catch {
		return [];
	}

	const sinceSeconds = Math.floor(since / 1000);
	const branches: string[] = [];
	for (const entry of entries) {
		const path = join(logDir, entry);
		const info = await stat(path).catch(() => null);
		if (!info?.isFile() || info.mtimeMs < since) continue;
		const lastLine = (await readFile(path, "utf8")).trimEnd().split("\n").pop();
		const [identity = "", message] = lastLine?.split("\t") ?? [];
		const pushedAtSeconds = Number(identity.split(" ").at(-2));
		if (message === PUSH_REFLOG_MESSAGE && pushedAtSeconds >= sinceSeconds) {
			branches.push(entry.split(sep).join("/"));
		}
	}
	return branches;
}
