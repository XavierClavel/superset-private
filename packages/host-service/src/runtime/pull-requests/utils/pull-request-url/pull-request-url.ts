export interface PullRequestUrlRef {
	owner: string;
	repo: string;
	number: number;
}

const PULL_REQUEST_URL =
	/^https:\/\/github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)\/pull\/([1-9]\d*)\/?$/;

export function parsePullRequestUrl(url: string): PullRequestUrlRef | null {
	const match = PULL_REQUEST_URL.exec(url.trim());
	if (!match) return null;
	const [, owner = "", repo = "", digits = ""] = match;
	const number = Number(digits);
	if (!Number.isSafeInteger(number)) return null;
	return { owner, repo, number };
}

export function uniquePullRequestRefs(urls: string[]): PullRequestUrlRef[] {
	const byKey = new Map<string, PullRequestUrlRef>();
	for (const url of urls) {
		const ref = parsePullRequestUrl(url);
		if (!ref) continue;
		const key = `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.number}`;
		if (!byKey.has(key)) byKey.set(key, ref);
	}
	return [...byKey.values()];
}
