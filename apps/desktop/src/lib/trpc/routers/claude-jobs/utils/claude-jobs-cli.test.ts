import { afterAll, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClaudeJobsCli } from "./claude-jobs-cli";

const root = await mkdtemp(join(tmpdir(), "claude-jobs-cli-"));
afterAll(() => rm(root, { recursive: true, force: true }));

async function fakeApp(name: string, version: string, script: string) {
	const app = join(root, name, "Claude Jobs.app");
	await mkdir(join(app, "Contents", "MacOS"), { recursive: true });
	await writeFile(
		join(app, "Contents", "Info.plist"),
		`<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
	<key>CFBundleShortVersionString</key>
	<string>${version}</string>
</dict></plist>`,
	);
	const binary = join(app, "Contents", "MacOS", "claude-jobs");
	await writeFile(binary, `#!/bin/sh\n${script}\n`);
	await chmod(binary, 0o755);
	return app;
}

describe("the claude-jobs binary of the installed app", () => {
	test("reads the version of the first app found", async () => {
		const app = await fakeApp("found", "0.15.0", "true");
		const cli = createClaudeJobsCli({
			appPaths: [join(root, "absent", "Claude Jobs.app"), app],
		});
		expect(await cli.version()).toBe("0.15.0");
	});

	test("without an app, has no version and runs nothing", async () => {
		const cli = createClaudeJobsCli({
			appPaths: [join(root, "absent", "Claude Jobs.app")],
		});
		expect(await cli.version()).toBeNull();
		await expect(cli.run(["status"])).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
	});

	test("passes the arguments and stdin, and returns stdout", async () => {
		const app = await fakeApp("echo", "0.15.0", 'echo "$@"; cat');
		const cli = createClaudeJobsCli({ appPaths: [app] });
		expect(await cli.run(["save"], '{"id":"j"}')).toBe('save\n{"id":"j"}');
	});

	test("a failed command is refused with what the app wrote to stderr", async () => {
		const app = await fakeApp(
			"fails",
			"0.15.0",
			'echo "No job called j." >&2; exit 1',
		);
		const cli = createClaudeJobsCli({ appPaths: [app] });
		await expect(cli.run(["delete", "j"])).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "No job called j.",
		});
	});

	test("a command that hangs is stopped", async () => {
		const app = await fakeApp("hangs", "0.15.0", "exec sleep 5");
		const cli = createClaudeJobsCli({ appPaths: [app], timeoutMs: 50 });
		await expect(cli.run(["status"])).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});
});
