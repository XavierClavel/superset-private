export const AUTO_UPDATE_STATUS = {
	IDLE: "idle",
	CHECKING: "checking",
	DOWNLOADING: "downloading",
	READY: "ready",
	/** Transient: the app just relaunched on a new version after an install */
	UPDATED: "updated",
	ERROR: "error",
} as const;

export type AutoUpdateStatus =
	(typeof AUTO_UPDATE_STATUS)[keyof typeof AUTO_UPDATE_STATUS];

export interface AutoUpdateProgress {
	percent: number;
	transferredBytes: number;
	totalBytes: number;
}

export interface AutoUpdateStatusEvent {
	status: AutoUpdateStatus;
	version?: string;
	error?: string;
	progress?: AutoUpdateProgress;
}

/**
 * Where this fork's desktop releases are published (electron-builder) and
 * where installed builds look for updates. Upstream's are paradevai/paradev;
 * an official release must not replace a fork build.
 */
export const RELEASES_REPO = {
	owner: "XavierClavel",
	repo: "superset-private",
} as const;

export const RELEASES_URL = `https://github.com/${RELEASES_REPO.owner}/${RELEASES_REPO.repo}/releases`;
