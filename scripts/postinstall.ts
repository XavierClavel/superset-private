// Bun on Windows cannot run shell scripts, so this replaces postinstall.sh.

// Prevent infinite recursion during postinstall
// electron-builder install-app-deps can trigger nested bun installs
// which would re-run postinstall, spawning hundreds of processes
if (process.env.SUPERSET_POSTINSTALL_RUNNING) {
	process.exit(0);
}

const env = { ...process.env, SUPERSET_POSTINSTALL_RUNNING: "1" };

function run(cmd: string[]): number {
	const result = Bun.spawnSync(cmd, {
		env,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	return result.exitCode ?? 1;
}

// Run sherif for workspace validation
const sherifExit = run(["bunx", "sherif"]);
if (sherifExit !== 0) {
	process.exit(sherifExit);
}

// Materialize the compiled Lingui catalogs. They are generated, not committed,
// and turbo builds them for any task that goes through the graph — but a direct
// `bun run --filter=<pkg> typecheck` bypasses turbo, so a fresh clone would hit
// "Cannot find module '../locales/en/messages'". Non-fatal: a missing
// translation must fail a real build, not an install.
if (run(["bun", "run", "--filter=@superset/i18n", "build"]) !== 0) {
	console.error(
		"postinstall: lingui compile failed; run 'bun run check:i18n' for details",
	);
}

// GitHub CI runs multiple Bun install jobs that do not need desktop native rebuilds.
// Running electron-builder here can trigger nested Bun installs while the main
// install is still materializing packages, which has been flaky with native deps.
if (process.env.CI) {
	process.exit(0);
}

// Electron 43+ no longer downloads its binary in a postinstall script. The dev
// scripts (patch-dev-protocol, clean-launch-services) and the host-service e2e
// runner expect node_modules/electron/dist to exist, so fetch it here.
run(["bun", "run", "--filter=@superset/desktop", "install:electron"]);

// Electron 44's V8 headers need a newer compiler than Debian bookworm's
// default gcc 12 and clang 14, so cloud sandboxes build with clang-16.
if (!env.CC && Bun.which("clang++-16")) {
	env.CC = "clang-16";
	env.CXX = "clang++-16";
}

// Install native dependencies for desktop app
process.exit(run(["bun", "run", "--filter=@superset/desktop", "install:deps"]));
