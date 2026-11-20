import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import { TRPCError } from "@trpc/server";

const APP_NAME = "Claude Jobs.app";
const COMMAND_TIMEOUT_MS = 30_000;

export interface ClaudeJobsCli {
	/** The installed app's version, or null when Claude Jobs is not installed. */
	version(): Promise<string | null>;
	/** Runs `claude-jobs <args>` with `input` on stdin, and returns its stdout. */
	run(args: string[], input?: string): Promise<string>;
	open(): Promise<void>;
}

export function createClaudeJobsCli({
	appPaths = [
		join(homedir(), "Applications", APP_NAME),
		join("/Applications", APP_NAME),
	],
	timeoutMs = COMMAND_TIMEOUT_MS,
}: {
	appPaths?: string[];
	timeoutMs?: number;
} = {}): ClaudeJobsCli {
	async function findApp(): Promise<{ path: string; version: string } | null> {
		for (const path of appPaths) {
			const plist = await readFile(
				join(path, "Contents", "Info.plist"),
				"utf8",
			).catch(() => null);
			const version = plist?.match(
				/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/,
			)?.[1];
			if (version) return { path, version };
		}
		return null;
	}

	async function appPath(): Promise<string> {
		const app = await findApp();
		if (!app) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: i18n._(msg({ message: "Claude Jobs is not installed." })),
			});
		}
		return app.path;
	}

	function exec(file: string, args: string[], input?: string) {
		return new Promise<string>((resolve, reject) => {
			const child = execFile(
				file,
				args,
				{ encoding: "utf8", timeout: timeoutMs },
				(error, stdout, stderr) => {
					if (!error) return resolve(stdout);
					reject(
						new TRPCError({
							code: "BAD_REQUEST",
							message: stderr.trim() || error.message,
							cause: error,
						}),
					);
				},
			);
			child.stdin?.end(input ?? "");
		});
	}

	return {
		version: async () => (await findApp())?.version ?? null,
		run: async (args, input) =>
			exec(
				join(await appPath(), "Contents", "MacOS", "claude-jobs"),
				args,
				input,
			),
		open: async () => {
			await exec("open", ["-a", await appPath()]);
		},
	};
}
