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
  in the toolbar's "…" menu. The fork also shows the run button beside it as an icon, with
  Force Stop and Configure in its own menu
  (`workspace/$workspaceId/components/WorkspaceToolbar`).
- **Agent status on project rows**: upstream shows agent status only on workspace rows, so a
  collapsed project hides an agent that waits for input. The fork shows on the right of each
  project row the needs-input, failed or ready-for-review dot when one of its workspaces asks
  for the user, else the working spinner. Unlike the workspace rows' order, every status that
  asks for the user outranks `working`
  (`DashboardSidebarWorkspaceStatusProvider/utils/getProjectStatus`).
- **Recent filter on the Projects list**: upstream's "Last active" sort reorders rows only inside
  each project, so a session that just ran can sit under a project far down the list. A clock
  button in the Projects header filters the list to the workspaces with agent activity in the
  last 14 days, still grouped by project, and hides the projects left empty. Projects and
  folders keep their collapsed state. Like the other filters, it turns off drag while it is on. The
  choice persists in `sidebarRecentView`
  (`DashboardSidebar/utils/filterDashboardSidebarByRecentActivity`).
  An agent session attaching or detaching no longer counts as activity for this filter or for
  "Last active": the app resumes a workspace's agent session when it restores its terminal, which
  marked idle workspaces active (`host-service` `fan-out-agent-lifecycle.ts`).
- **No CLA check**: upstream's `.github/workflows/cla.yml` asks every PR author outside its
  allowlist to sign Superset's CLA, and on this fork it failed on every PR because its
  `cla-signatures` branch does not exist. This fork takes no outside contributions, so the
  workflow is removed. If a rebase conflicts on it, keep the deletion.
- **Wrapped URLs clickable on every row**: Claude Code breaks a long URL onto new lines itself,
  so xterm sees unrelated rows and only the first, cut-off row is a link. Claude Code sends
  OSC 8 hyperlinks, which carry the full URL on every row, only to a terminal it knows supports
  them, and these terminals set no `TERM_PROGRAM` (`TERMINAL_IDENTITY_ENV_KEYS`). Both terminal
  environments set `FORCE_HYPERLINK=1` (`main/lib/terminal/env.ts`, host-service
  `terminal/env.ts`). xterm underlined only the hovered row of such a link; the xterm patch
  joins rows that carry the same link id (item 7 in `patches/README.md`).
- **Mobile pane always offered**: upstream hides the simulator pane behind the `mobile-pane`
  PostHog flag (#8789); `renderer/hooks/useMobilePaneEnabled` keeps it on.
- **Release builds share the official app's data**: a Paradev workspace's `.env` names its own
  dev instance (`SUPERSET_WORKSPACE_NAME`, localhost servers, ports). A release build ignores those
  (`apps/desktop/vite/release-env.ts`), so whatever workspace it is built in, the app uses the
  same `~/.paradev` home, `~/Library/Application Support/Superset`, `superset://` links and
  servers as official Superset, and keeps every session and project.
- **Updates come from this repository**: `RELEASES_REPO` in
  `apps/desktop/src/shared/auto-update.ts` sets where installed builds look for updates and where
  electron-builder publishes, so an official release does not replace a fork build.
- **A release on every merge to main**: `.github/workflows/release-fork.yml`. Fork versions end in
  `-fork.<run>`, and only `-canary` versions count as canary (`isCanaryVersion`), so a fork build
  reads the stable feed and shows the stable icon and notices. `build-desktop.yml` trusts a
  self-signed signing certificate on the runner, because electron-builder signs only with trusted
  identities.

## Releasing

Every push to `main` runs `release-fork.yml`. It builds `<apps/desktop version>-fork.<run number>`
(for example `2.0.9-fork.14`), signs it, and publishes it as the latest release. Installed builds
read `https://github.com/XavierClavel/superset-private/releases/latest/download/latest-mac.yml`
and install it at their next check, every 4 hours or from "Check for Updates". The run number only
goes up, and after a rebase the upstream version does too, so each release is newer than the one
before.

macOS installs an update only when it is signed with the same certificate as the installed build.
Releases are signed with a self-signed code-signing certificate, held in the `MAC_CERTIFICATE`
(base64 `.p12`) and `MAC_CERTIFICATE_PASSWORD` repository secrets. The original is in
`~/.superset-fork/codesign.p12`, with its password in `~/.superset-fork/codesign.password`.
Losing it means a new certificate and one more install by hand. There is no notarization: that
needs an Apple Developer ID.

A `bun run build` on this Mac is ad-hoc signed, so it cannot update to a release. To get back on
the release track, install the latest release by hand:

```bash
gh release download --repo XavierClavel/superset-private --pattern '*-arm64-mac.zip' --dir /tmp/superset-release
ditto -x -k /tmp/superset-release/*-arm64-mac.zip /tmp/superset-release
mv /Applications/Superset.app /tmp/superset-release/Superset-previous.app
ditto /tmp/superset-release/Superset.app /Applications/Superset.app
```

Keychain access asks once after a change of certificate ("Superset Safe Storage"): choose Always
Allow. Switching from official Superset to a fork build is the same manual install. The sign-in
(`~/.paradev/auth-token.enc`) is encrypted with a key derived from the machine, not the app, so the
fork build stays signed in.

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
