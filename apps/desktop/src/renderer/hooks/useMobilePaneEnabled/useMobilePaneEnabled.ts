/**
 * Whether the Mobile pane (local iOS simulators and Android emulators) is
 * offered in the right pane menus and the split hotkey.
 *
 * Upstream hides it behind the `mobile-pane` PostHog flag (#8789) until
 * agents can drive the device. This fork keeps it on for everyone, as it was
 * before that flag.
 */
export function useMobilePaneEnabled(): boolean {
	return true;
}
