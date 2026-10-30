# Workspace labels — design

## Intent

A user with many workspaces (56 across 15 repos on the requester's machine) wants to:

1. See at a glance which workspaces are important.
2. See only the workspaces of one topic (a project or a feature), even when that topic spans
   several repos — for example a feature that touches both `backend-zourite-api` and
   `zourite-tooling`.

Workspace tags exist today, but they do not serve this. A tag files the workspace into a sidebar
folder inside its project. A workspace with several tags shows in one folder only, and a tag in
two repos makes two unrelated folders. In practice tags are a tree, not labels.

## What we build

**Labels**: a new concept, separate from tags and tag folders.

- A label has a name and a color. It shows as a colored pill (bubble) with its name.
- A workspace can carry zero, one or several labels.
- Labels are global: the same label applies to workspaces in any project, and to project-less
  (Sessions) workspaces.
- Labels are personal (only the user who made them sees them) and live on one machine.
- Adding or removing a label never changes a workspace's tags, folder or position.

### Display

- Each workspace row in the left sidebar shows its label pills under its name.

### Assign labels

- **Sidebar**: right-click a workspace → "Labels" submenu → one checkbox per existing label, plus
  "New label…", which asks for a name and a color and assigns the new label to that workspace.
- **Workspace creation**: the new-workspace dialog has the same label picker.

### Manage labels

- A row of pills at the top of the sidebar lists every label (mockup option A).
- Right-click a pill in that row → rename, change color, delete.
- Color comes from a fixed palette of about 8 colors.
- Deleting a label removes it from every workspace.

### Filter

- Click a pill in the top row: the whole sidebar, across all projects, shows only workspaces
  that carry that label. The active pill is highlighted.
- Click the active pill again: the filter goes away.
- One label at a time.
- Projects with no matching workspace are hidden while the filter is on.
- The active filter persists across app restarts.

Mockup the user chose (option A):

```
┌─────────────────────────────┐
│ (Tout) (important) [feature-x] (refacto) │  ← top row, feature-x active
│ BACKEND-ZOURITE-API         │
│   add-export-endpoint       │
│   (feature-x) (important)   │
│ ZOURITE-TOOLING             │
│   export-ui                 │
│   (feature-x)               │
└─────────────────────────────┘
```

## Goals

- Find important workspaces fast.
- Show one topic's workspaces across all repos with one click.

## Non-goals

- Sharing labels with teammates.
- Syncing labels across machines or to cloud workspaces.
- Filtering on several labels at once.
- CLI support for labels.
- Changing how tags and tag folders work.

## Anti-goals

- Adding a label moves a workspace into a folder, or changes its tags. This is the exact problem
  with reusing tags.
- The filter only applies inside one project.

## Constraints

- Desktop app, left sidebar (`apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/`).
- Labels and assignments are entity-keyed data with unbounded cardinality, so per
  `apps/desktop/AGENTS.md` they go in host-side SQLite, not renderer localStorage. The
  host-service already stores comparable per-user data the same way: `tagFolderSettings` in
  `packages/host-service/src/db/schema.ts`, with a store in `packages/host-service/src/tag-folders/`
  and a tRPC router in `packages/host-service/src/trpc/router/tag-folders/`.
- New tRPC procedures on the host-service must follow `packages/trpc/AGENTS.md` and the
  `trpc-compat` skill (released clients call it).
- User-facing strings use Lingui and need translations (`bun run check:i18n`).
- Project structure rules from the root `AGENTS.md` (one folder per component, co-location).

## Calls I made (not discussed with the user)

- Scope: only workspaces on the local host can carry labels. The user works on one machine.
  Workspaces from remote hosts (relay) and cloud workspaces show no pills and no "Labels" menu.
  The new-workspace dialog shows the picker only when the target is the local host.
- While a filter is on, everything that cannot match is hidden: remote-host workspaces, the Cloud
  section, Pinned rows without the label, tag-folder headers with no match.
- Clicking "Tout" clears the filter. Deleting the label that is the active filter clears the
  filter.
- Storage: two host-service SQLite tables in the local host's DB — labels (id, owner user id, name, color, order) and
  assignments (workspace id, label id). Filter state: small singleton UI state, so renderer
  persisted state is fine, registered per the localStorage policy.
- When a workspace is deleted, its assignments go with it.
- Label names are unique per user (case-insensitive).
- The top row is hidden when the user has no labels.

## Left to the builder

- Exact palette values (should fit light and dark themes).
- Pill size and how many pills a row shows before it truncates.
- Order of labels in the top row (creation order is fine).
- How the filter interacts with the existing text search in the sidebar.
