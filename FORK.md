# About this fork

This repository is a **modified version** of
[superset-sh/superset](https://github.com/superset-sh/superset), copyright Superset, Inc.,
distributed under the [Elastic License 2.0](./LICENSE.md). The license terms are unchanged and
apply to this fork.

Under ELv2 you must not offer this software to third parties as a hosted or managed service, and
you must not remove license-key functionality or licensing notices. Self-hosting for your own use
is allowed.

## Changes from upstream

- **Windows build support**
  - `scripts/postinstall.ts` replaces `scripts/postinstall.sh`, because Bun on Windows cannot run
    shell scripts as package hooks.
  - `apps/desktop/scripts/copy-native-modules.ts` dereferences nested Bun symlinks on Windows,
    because creating symlinks there needs admin rights or Developer Mode.
  - `apps/desktop/scripts/prepare-win-codesign.ts` (run by `prebuild`, no-op off Windows) seeds
    electron-builder's `winCodeSign-2.6.0` cache. The upstream archive contains macOS symlinks
    that Windows cannot extract without admin rights.
  - `packages/macos-process-metrics/.gitignore` ignores the `bin/` rebuild cache.

## Building on Windows

Prerequisites:

| Tool | Notes |
|:-----|:------|
| [Bun](https://bun.sh/) 1.4.2+ | `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| Git with long paths | `git config --global core.longpaths true` **before cloning**; some paths exceed 260 characters |
| Visual Studio Build Tools 2019 or 2022 | "Desktop development with C++" workload |
| MSVC Spectre-mitigated libraries | VS Installer → Individual components → "MSVC … x64/x86 Spectre-mitigated libs" (needed by `node-pty` and `native-keymap`) |
| Python 3 | Used by `node-gyp` |

```powershell
git clone -c core.longpaths=true https://github.com/XavierClavel/superset-private.git superset
cd superset
bun install
bun run build
```

The NSIS installer is written to `apps/desktop/release/`.

## Syncing with upstream

```bash
git fetch upstream
git merge upstream/main
```
