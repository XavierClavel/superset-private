/**
 * Build-time variables that make a build its own instance: the home folder
 * (`~/.paradev-<name>`) and deep-link scheme picked from the workspace name,
 * the servers it signs in to, the ports it listens on, and dev mode.
 *
 * A Paradev workspace's `.env` sets all of them for that workspace's dev
 * instance. A release build of this fork replaces the official app on the
 * machine and must keep its sessions, data and account, so it drops these and
 * builds with the official values, which are the defaults in
 * electron.vite.config.ts and the env schemas.
 */
export const INSTANCE_ENV_KEYS = [
	"DESKTOP_NOTIFICATIONS_PORT",
	"DESKTOP_VITE_PORT",
	"NEXT_PUBLIC_API_URL",
	"NEXT_PUBLIC_DOCS_URL",
	"NEXT_PUBLIC_MARKETING_URL",
	"NEXT_PUBLIC_ROOT_DOMAIN",
	"NEXT_PUBLIC_STREAMS_URL",
	"NEXT_PUBLIC_WEB_URL",
	"NODE_ENV",
	"REALTIME_URL",
	"RELAY_URL",
	"SKIP_ENV_VALIDATION",
	"STREAMS_URL",
	"SUPERSET_HOME_DIR",
	"SUPERSET_WORKSPACE_NAME",
] as const;

/** Removes the instance variables from `env`; returns the ones that were set. */
export function dropInstanceEnv(env: NodeJS.ProcessEnv): string[] {
	const dropped = INSTANCE_ENV_KEYS.filter((key) => env[key] !== undefined);
	for (const key of dropped) delete env[key];
	return dropped;
}
