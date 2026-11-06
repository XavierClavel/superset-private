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
- **Base branch of a new workspace** (port of ParadevAI/Paradev#8032, open upstream): the
  composer seeds the project's saved base branch when it mounts, so a base left over from another
  project no longer makes the host fork the worktree from its local `HEAD`
  (`NewWorkspaceScreen/hooks/useBaseBranchReset`).
- **Window drag** (ParadevAI/Paradev#9178, open upstream): the window could not be moved by its
  top row while the sidebar's workspace list was scrolled down, or while tabs overflowed. Chromium
  reports each element's drag region at full size, ignoring scroll clipping, and every element
  inherited `no-drag` from `body`, so rows scrolled out of view switched the drag strips above
  them off. Inside `<app>` only `.drag` and `.no-drag` elements report a region now
  (`renderer/globals.css`), and the pane tab track no longer sets `no-drag`.
- **Run button in the workspace toolbar**: with the right pane area on, upstream puts Run/Stop
  in the toolbar's "…" menu. The fork shows the run button beside it as an icon, with
  Force Stop and Configure in its own menu, and the "…" menu keeps only the "Open in" targets
  (`v2-workspace/$workspaceId/components/WorkspaceToolbar`).
- **Agent status on project rows**: upstream shows agent status only on workspace rows, so a
  collapsed project hides an agent that waits for input. The fork shows on the right of each
  project row the needs-input, failed or ready-for-review dot when one of its workspaces asks
  for the user, else the working spinner. Unlike the workspace rows' order, every status that
  asks for the user outranks `working`
  (`DashboardSidebarWorkspaceStatusProvider/utils/getProjectStatus`).
- **No CLA check**: upstream's `.github/workflows/cla.yml` asks every PR author outside its
  allowlist to sign Superset's CLA, and on this fork it failed on every PR because its
  `cla-signatures` branch does not exist. This fork takes no outside contributions, so the
  workflow is removed. If a rebase conflicts on it, keep the deletion.
- **Wrapped URLs clickable on every row**: Claude Code breaks a long URL onto new lines itself,
  so xterm sees unrelated rows and only the first, cut-off row is a link. Claude Code sends
  OSC 8 hyperlinks, which carry the full URL on every row, only to a terminal it knows supports
  them, and these terminals set no `TERM_PROGRAM` (`TERMINAL_IDENTITY_ENV_KEYS`). Both terminal
  environments set `FORCE_HYPERLINK=1` (`main/lib/terminal/env.ts`, host-service
  `terminal/env.ts`).
- **Mobile pane always offered**: upstream hides the simulator pane behind the `mobile-pane`
  PostHog flag (#8789); `renderer/hooks/useMobilePaneEnabled` keeps it on.
- **Release builds share the official app's data**: a Paradev workspace's `.env` names its own
  dev instance (`SUPERSET_WORKSPACE_NAME`, localhost servers, ports). A release build ignores those
  (`apps/desktop/vite/release-env.ts`), so whatever workspace it is built in, the app uses the
  same `~/.paradev` home, `~/Library/Application Support/Superset`, `superset://` links and
  servers as official Superset, and keeps every session and project.
- **Updates come from this repository**: `RELEASES_REPO` in
  `apps/desktop/src/shared/auto-update.ts` sets where installed builds look for updates and where
  electron-builder publishes, so an official release no longer replaces a fork build.

## Releasing

Installed builds read
`https://github.com/XavierClavel/superset-private/releases/latest/download/latest-mac.yml`. An
update arrives only when all of these hold:

- A published release (not a draft) holds the `latest-mac.yml`, `.zip` and `.zip.blockmap` that
  `bun run build` writes to `apps/desktop/release/`, for example
  `gh release create v<version> apps/desktop/release/*.{yml,zip,blockmap,dmg} --repo XavierClavel/superset-private`.
- Its version (`apps/desktop/package.json`) is higher than the installed one. After a rebase it
  is upstream's; a fork-only release bumps the patch above the last fork release.
- The app can read the release without credentials. This repository is private, so it gets a 404:
  make it public, or publish to a public releases-only repository and set `RELEASES_REPO` to it.
- The new build is signed with the same certificate as the installed one: macOS refuses an update
  otherwise. Without a signing identity, builds are only ad-hoc signed and every update is
  refused; sign every build with one Developer ID or self-signed code-signing certificate.

Switching from official Superset to a fork build is a manual install: drag the fork's app over
`/Applications/Superset.app`. The sign-in (`~/.paradev/auth-token.enc`) is encrypted with a key
derived from the machine, not the app, so the fork build stays signed in.

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

The fork's commits are rebased on upstream, so they stay a short list on top of it:

```bash
git remote add upstream https://github.com/superset-sh/superset.git  # once
git fetch upstream
git rebase upstream/main
```

Host-service migrations (`packages/host-service/drizzle`): when upstream has added migrations,
renumber the fork's after upstream's last one, keep each fork migration's journal `when`, and
point the first fork snapshot's `prevId` at upstream's last snapshot. `bunx drizzle-kit generate`
in `packages/host-service` must then report no schema changes. The host-service applies every
migration whose `when` it has not recorded (`@superset/shared/sqlite-migrations`), so databases
from earlier fork builds still get upstream's migrations; `src/db/fork-migrations.test.ts` checks
it.

A local build without `NEXT_PUBLIC_POSTHOG_KEY` has no PostHog, so every feature flag reads off.
