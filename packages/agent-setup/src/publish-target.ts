import fs from "node:fs";
import path from "node:path";
import { resolveAppHomeDir } from "./paths";
import { writeFileIfChanged } from "./write-file-if-changed";

export const PUBLISH_TARGETS = ["page", "artifact"] as const;
export type PublishTarget = (typeof PUBLISH_TARGETS)[number];
export const DEFAULT_PUBLISH_TARGET: PublishTarget = "page";

/** Read by artifact-guard.template.sh too: keep the file name and values in sync. */
export const PUBLISH_TARGET_FILE_NAME = "publish-target";

export function getPublishTargetPath(
	homeDir: string = resolveAppHomeDir(),
): string {
	return path.join(homeDir, PUBLISH_TARGET_FILE_NAME);
}

export function isPublishTarget(value: unknown): value is PublishTarget {
	return PUBLISH_TARGETS.includes(value as PublishTarget);
}

export function readPublishTarget(
	homeDir: string = resolveAppHomeDir(),
): PublishTarget {
	try {
		const value = fs
			.readFileSync(getPublishTargetPath(homeDir), "utf-8")
			.trim();
		return isPublishTarget(value) ? value : DEFAULT_PUBLISH_TARGET;
	} catch {
		return DEFAULT_PUBLISH_TARGET;
	}
}

export function writePublishTarget(
	target: PublishTarget,
	homeDir: string = resolveAppHomeDir(),
): void {
	writeFileIfChanged(getPublishTargetPath(homeDir), `${target}\n`, 0o644);
}
