import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import { formatCompactRelativeTime } from "@superset/i18n/format";

// Both directions come from Intl.RelativeTimeFormat: it renders the compact
// "3d ago" / "in 2h" shape in every locale, so these need no catalog entries
// beyond the two "right now" cases where a bare unit would read oddly.
export function compactUntil(at: number, now: Date): string {
	if (at - now.getTime() < 60_000) {
		return i18n._(msg({ message: "soon" }));
	}
	return formatCompactRelativeTime(at, now);
}

export function compactAgo(at: number, now: Date): string {
	if (now.getTime() - at < 60_000) {
		return i18n._(msg({ message: "just now" }));
	}
	return formatCompactRelativeTime(at, now);
}
