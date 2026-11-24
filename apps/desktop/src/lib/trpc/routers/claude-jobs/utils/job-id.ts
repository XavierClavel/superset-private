const MAX_LENGTH = 40;

/**
 * A new job's id from its name, in the form Claude Jobs accepts: lowercase
 * letters, digits and dashes, starting with a letter or digit, at most 40
 * characters. Never one of `taken`.
 */
export function jobIdFor(name: string, taken: string[]): string {
	const slug =
		name
			.normalize("NFKD")
			.replace(/\p{Mark}/gu, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "job";
	const fit = (base: string, suffix: string) =>
		`${base.slice(0, MAX_LENGTH - suffix.length).replace(/-+$/, "")}${suffix}`;
	let id = fit(slug, "");
	for (let n = 2; taken.includes(id); n++) id = fit(slug, `-${n}`);
	return id;
}
