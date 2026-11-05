import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dropInstanceEnv, INSTANCE_ENV_KEYS } from "./release-env";

const CONFIG = readFileSync(
	resolve(import.meta.dir, "../electron.vite.config.ts"),
	"utf8",
);
const WORKSPACE_SETUP = readFileSync(
	resolve(import.meta.dir, "../../../.paradev/lib/setup/steps.sh"),
	"utf8",
);

/** Variables the build bakes into the app (`"process.env.X": defineEnv(…)`). */
function bakedKeys(): Set<string> {
	return new Set(
		[...CONFIG.matchAll(/"process\.env\.([A-Z0-9_]+)":\s*defineEnv/g)].map(
			(match) => match[1] as string,
		),
	);
}

/** Variables a Paradev workspace's setup writes into its `.env`. */
function workspaceKeys(): Set<string> {
	return new Set(
		[...WORKSPACE_SETUP.matchAll(/write_env_var "([A-Z0-9_]+)"/g)].map(
			(match) => match[1] as string,
		),
	);
}

describe("release builds", () => {
	test("drop what a workspace .env sets and keep the rest", () => {
		const env: NodeJS.ProcessEnv = {
			SUPERSET_WORKSPACE_NAME: "fix-drag",
			NEXT_PUBLIC_API_URL: "http://localhost:3001",
			NODE_ENV: "development",
			NEXT_PUBLIC_POSTHOG_KEY: "phc_key",
			PATH: "/usr/bin",
		};

		expect(dropInstanceEnv(env).sort()).toEqual([
			"NEXT_PUBLIC_API_URL",
			"NODE_ENV",
			"SUPERSET_WORKSPACE_NAME",
		]);
		expect(env).toEqual({
			NEXT_PUBLIC_POSTHOG_KEY: "phc_key",
			PATH: "/usr/bin",
		});
	});

	test("cover every baked variable a workspace .env overrides", () => {
		const baked = bakedKeys();
		expect(baked.size).toBeGreaterThan(10);
		const overridden = [...workspaceKeys()].filter((key) => baked.has(key));
		expect(overridden.length).toBeGreaterThan(0);
		const missed = overridden.filter(
			(key) => !(INSTANCE_ENV_KEYS as readonly string[]).includes(key),
		);
		expect(missed).toEqual([]);
	});

	test("drop the workspace name, which picks the home folder", () => {
		expect(bakedKeys().has("SUPERSET_WORKSPACE_NAME")).toBe(true);
		expect(INSTANCE_ENV_KEYS).toContain("SUPERSET_WORKSPACE_NAME");
	});
});
