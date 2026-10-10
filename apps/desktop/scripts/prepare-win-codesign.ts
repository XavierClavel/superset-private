// electron-builder's rcedit archive holds macOS symlinks that Windows cannot
// extract without admin rights, so seed its cache without the darwin folder.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WIN_CODE_SIGN = "winCodeSign-2.6.0";
const ARCHIVE_URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${WIN_CODE_SIGN}/${WIN_CODE_SIGN}.7z`;

if (process.platform !== "win32") {
	process.exit(0);
}

const cacheRoot =
	process.env.ELECTRON_BUILDER_CACHE ??
	join(process.env.LOCALAPPDATA ?? tmpdir(), "electron-builder", "Cache");
const destination = join(cacheRoot, "winCodeSign", WIN_CODE_SIGN);

if (existsSync(join(destination, "rcedit-x64.exe"))) {
	console.log(`${WIN_CODE_SIGN} already in cache: ${destination}`);
	process.exit(0);
}

const workDir = join(tmpdir(), `superset-${WIN_CODE_SIGN}-${process.pid}`);
const archivePath = join(workDir, `${WIN_CODE_SIGN}.7z`);
const extractDir = join(workDir, "out");
mkdirSync(extractDir, { recursive: true });

console.log(`Downloading ${ARCHIVE_URL}`);
const response = await fetch(ARCHIVE_URL);
if (!response.ok) {
	console.error(`Download failed: ${response.status} ${response.statusText}`);
	process.exit(1);
}
await Bun.write(archivePath, response);

// System32 tar is libarchive, which reads 7z; Git Bash's GNU tar does not.
const windowsTar = join(
	process.env.SystemRoot ?? "C:\\Windows",
	"System32",
	"tar.exe",
);
execFileSync(
	windowsTar,
	["-xf", archivePath, "-C", extractDir, "--exclude", "darwin"],
	{ stdio: "inherit" },
);

rmSync(destination, { recursive: true, force: true });
mkdirSync(join(cacheRoot, "winCodeSign"), { recursive: true });
renameSync(extractDir, destination);
rmSync(workDir, { recursive: true, force: true });
console.log(`Seeded ${WIN_CODE_SIGN} cache: ${destination}`);
