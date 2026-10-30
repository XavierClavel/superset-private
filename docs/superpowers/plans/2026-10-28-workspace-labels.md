# Workspace Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personal colored labels on local workspaces, shown as pills in the desktop sidebar, with a one-click filter that shows only one label's workspaces across all projects.

**Architecture:** Labels and assignments live in two new tables in the local host-service SQLite DB, behind a new `workspaceLabels` tRPC router. The renderer reads them from the local host only (`activeHostUrl`) with one React Query, and mutations invalidate that query (no event-bus message: one user, one machine). The active filter label id is a new field on the existing `v2UserPreferences` singleton. A pure filter function prunes projects, Sessions and Pinned before they reach the existing sidebar render path.

**Tech Stack:** host-service (drizzle-orm sqlite, drizzle-kit, tRPC, zod, bun:test), desktop renderer (React, TanStack Query, TanStack DB collections, Lingui, `@superset/ui` context menu / dialog).

**Spec:** `docs/superpowers/specs/2026-10-28-workspace-labels-design.md`

## Global Constraints

- Labels are separate from workspace tags and tag folders. No code path in this plan reads or writes `workspace_tags` or `tag_folder_settings`.
- Only workspaces with `hostType === "local-device"` carry labels. Remote-host and cloud rows show no pills and no "Labels" menu.
- Labels are per user: every row carries `created_by_user_id`; reads and writes are scoped to `ctx.userId`.
- Label name: trimmed, 1–40 characters, unique per user ignoring case.
- Label color: one of the `value`s in `PROJECT_COLORS` (`apps/desktop/src/shared/constants/project-colors.ts`). The host stores any string ≤ 50 chars; the renderer only offers the palette.
- Filter: one label at a time; persists across restarts; "Tout" (English source: "All") clears it; deleting the active label clears it.
- While a filter is on: projects with no match are hidden; Sessions, Pinned and tag folders show only matches; the Cloud section is hidden.
- The top row of pills is hidden when the user has no labels, and in the collapsed icon rail.
- All new user-facing strings use Lingui; run `bun run check:i18n` and fill every locale's `messages.po`.
- New host-service procedures only; no existing procedure changes shape (`packages/trpc/AGENTS.md`, `trpc-compat` skill).
- Project structure per root `AGENTS.md`: one folder per component with `index.ts`; co-located tests.
- No comments unless the code cannot say it (root `AGENTS.md`).

## Review Focus

1. **Older local host without the router** (app updated, host-service not yet restarted): the labels query fails. Expected: sidebar renders normally with no pills and no top row; no error toast loop. → test in Task 3.
2. **Active filter points to a label that no longer exists** (deleted from another window, or DB reset). Expected: filter treated as off. → test in Task 3.
3. **Duplicate name with different case/spaces** (" Important" vs "important"). Expected: create/rename rejected with a `CONFLICT` error the UI shows inline. → test in Task 1.
4. **Assigning a label of another user, or to an unknown workspace id.** Expected: rejected (`NOT_FOUND`), nothing written. → test in Task 1.
5. **Filter on with the active workspace not matching.** Expected: the active workspace is hidden like any other; navigation is not changed. → test in Task 4 (pure filter does not special-case it).

---

### Task 1: Host-service tables and label store

**Files:**
- Modify: `packages/host-service/src/db/schema.ts` (add two tables after `workspaceTags`)
- Create: `packages/host-service/drizzle/0038_*.sql` + `drizzle/meta/*` (generated, do not hand-edit)
- Create: `packages/host-service/src/workspace-labels/workspace-label-store.ts`
- Create: `packages/host-service/src/workspace-labels/index.ts`
- Test: `packages/host-service/src/workspace-labels/workspace-label-store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface WorkspaceLabelSnapshot { id: string; name: string; color: string; sortOrder: number }
  export interface WorkspaceLabelAssignment { workspaceId: string; labelId: string }
  export interface WorkspaceLabelStoreContext { db: HostDb; userId: string | null | undefined }
  export class WorkspaceLabelNameConflictError extends Error {}
  export class WorkspaceLabelNotFoundError extends Error {}
  export function listWorkspaceLabels(ctx): { labels: WorkspaceLabelSnapshot[]; assignments: WorkspaceLabelAssignment[] }
  export function createWorkspaceLabel(ctx, input: { name: string; color: string }): WorkspaceLabelSnapshot
  export function updateWorkspaceLabel(ctx, id: string, patch: { name?: string; color?: string }): WorkspaceLabelSnapshot
  export function deleteWorkspaceLabel(ctx, id: string): void
  export function setWorkspaceLabels(ctx, workspaceId: string, labelIds: string[]): WorkspaceLabelAssignment[]
  ```

Schema:
- `workspaceLabels` → table `workspace_labels`: `id` text PK (uuid), `created_by_user_id` text not null default `''`, `name` text not null, `name_key` text not null (trimmed + lowercased name), `color` text not null, `sort_order` integer not null, `created_at` integer not null. Unique index `workspace_labels_owner_name_key_idx` on (`created_by_user_id`, `name_key`).
- `workspaceLabelAssignments` → table `workspace_label_assignments`: `workspace_id` FK → `workspaces.id` on delete cascade, `label_id` FK → `workspace_labels.id` on delete cascade, `created_at`. PK (`workspace_id`, `label_id`). Index on `label_id`.

Store rules: `''` for a null user (same convention as `workspaceTags`). Lists filter by owner, labels ordered by `sort_order` then `created_at`; new labels get `max(sort_order)+1`. `listWorkspaceLabels` returns only assignments on non-archived workspaces. `setWorkspaceLabels` replaces the workspace's set for this user's labels in one transaction and leaves other users' assignments alone.

- [ ] **Step 1: Add both tables to `schema.ts`, then generate the migration**

Run: `cd packages/host-service && bun run generate`
Expected: one new `drizzle/0038_*.sql` creating both tables and the indexes; snapshot + `_journal.json` updated.

- [ ] **Step 2: Write the failing store tests** (harness copied from `tag-folder-store.test.ts`: in-memory sqlite, `PRAGMA foreign_keys = ON`, migrate, insert one project and two workspaces)

```ts
it("creates labels in order and lists them for their owner only", () => {
  createWorkspaceLabel(alice, { name: " Important ", color: "#ef4444" });
  createWorkspaceLabel(alice, { name: "feature-x", color: "#3b82f6" });
  createWorkspaceLabel(bob, { name: "mine", color: "#22c55e" });
  expect(listWorkspaceLabels(alice).labels.map((l) => [l.name, l.sortOrder]))
    .toEqual([["Important", 0], ["feature-x", 1]]);
});
it("rejects a duplicate name ignoring case and spaces, per user", () => {
  createWorkspaceLabel(alice, { name: "Important", color: "#ef4444" });
  expect(() => createWorkspaceLabel(alice, { name: " important", color: "#000" }))
    .toThrow(WorkspaceLabelNameConflictError);
  expect(() => createWorkspaceLabel(bob, { name: "important", color: "#000" })).not.toThrow();
});
it("rename to an existing name conflicts; rename to same name with new case passes", ...);
it("setWorkspaceLabels replaces the set and keeps other users' assignments", ...);
it("setWorkspaceLabels rejects another user's label and an unknown workspace", () => {
  expect(() => setWorkspaceLabels(alice, WS_1, [bobLabel.id])).toThrow(WorkspaceLabelNotFoundError);
  expect(() => setWorkspaceLabels(alice, "nope", [aliceLabel.id])).toThrow(WorkspaceLabelNotFoundError);
  expect(listWorkspaceLabels(alice).assignments).toEqual([]);
});
it("deleting a label removes its assignments", ...);
it("deleting a workspace row removes its assignments", ...);
it("hides assignments on archived workspaces", ...);
it("update/delete of another user's label throws WorkspaceLabelNotFoundError", ...);
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `cd packages/host-service && bun test src/workspace-labels`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement the store and `index.ts` barrel**

- [ ] **Step 5: Run tests, verify they pass**

Run: `cd packages/host-service && bun test src/workspace-labels src/db`
Expected: PASS (includes existing `migrations.test.ts`).

- [ ] **Step 6: Commit** — `feat(host-service): store personal workspace labels`

---

### Task 2: `workspaceLabels` tRPC router

**Files:**
- Create: `packages/host-service/src/trpc/router/workspace-labels/workspace-labels.ts`
- Create: `packages/host-service/src/trpc/router/workspace-labels/index.ts`
- Modify: `packages/host-service/src/trpc/router/router.ts` (register `workspaceLabels: workspaceLabelsRouter` next to `tagFolders`)
- Test: `packages/host-service/src/trpc/router/workspace-labels/workspace-labels.test.ts`

**Interfaces:**
- Consumes: Task 1 store.
- Produces (all `protectedProcedure`, ctx `{ db: ctx.db, userId: ctx.userId }`):
  - `workspaceLabels.list` query → `{ labels: WorkspaceLabelSnapshot[]; assignments: WorkspaceLabelAssignment[] }`
  - `workspaceLabels.create` mutation `{ name: string (trim, 1..40), color: string (1..50) }` → `WorkspaceLabelSnapshot`
  - `workspaceLabels.update` mutation `{ id: uuid, name?: same, color?: same }` → `WorkspaceLabelSnapshot`
  - `workspaceLabels.delete` mutation `{ id: uuid }` → `{ success: true }`
  - `workspaceLabels.setForWorkspace` mutation `{ workspaceId: string, labelIds: uuid[] (max 50) }` → `WorkspaceLabelAssignment[]`
  - Error mapping: `WorkspaceLabelNameConflictError` → `TRPCError CONFLICT`; `WorkspaceLabelNotFoundError` → `NOT_FOUND`.

- [ ] **Step 1: Write failing router tests** with `createCaller` (look for an existing router test in `packages/host-service/src/trpc/router/**/*.test.ts` for the caller/context helper): create → list round trip; duplicate create rejects with `code: "CONFLICT"`; `setForWorkspace` with an unknown workspace rejects with `code: "NOT_FOUND"`; name `"   "` rejects at input validation (`BAD_REQUEST`).

- [ ] **Step 2: Run, verify fail** — `cd packages/host-service && bun test src/trpc/router/workspace-labels` → FAIL.

- [ ] **Step 3: Implement router + register it.**

- [ ] **Step 4: Run, verify pass**, then `bun run typecheck` at the repo root filtered to host-service (`bunx turbo typecheck --filter=@superset/host-service`) → no errors.

- [ ] **Step 5: Commit** — `feat(host-service): expose workspace labels over tRPC`

---

### Task 3: Renderer data hook and persisted filter

**Files:**
- Create: `apps/desktop/src/renderer/hooks/workspace-labels/useWorkspaceLabels/useWorkspaceLabels.ts`
- Create: `apps/desktop/src/renderer/hooks/workspace-labels/useWorkspaceLabels/useWorkspaceLabels.utils.ts`
- Create: `apps/desktop/src/renderer/hooks/workspace-labels/useWorkspaceLabels/useWorkspaceLabels.utils.test.ts`
- Create: `apps/desktop/src/renderer/hooks/workspace-labels/useWorkspaceLabels/index.ts`
- Modify: `apps/desktop/src/renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal/schema.ts` (add `sidebarLabelFilterId: z.string().nullable().default(null)` to `v2UserPreferencesSchema`, `null` in `DEFAULT_V2_USER_PREFERENCES`, and carry it in the read-normalizer near line 636)
- Modify: `apps/desktop/src/renderer/hooks/useV2UserPreferences/useV2UserPreferences.ts` (add `setSidebarLabelFilterId(next: string | null)`, same pattern as `setSidebarProjectSortMode`)

**Interfaces:**
- Consumes: Task 2 procedures via `getHostServiceClientByUrl(activeHostUrl)`; `useLocalHostService()`.
- Produces:
  ```ts
  export interface WorkspaceLabel { id: string; name: string; color: string; sortOrder: number }
  export interface UseWorkspaceLabelsResult {
    labels: WorkspaceLabel[];                                // [] when host missing/old/offline
    labelsByWorkspaceId: ReadonlyMap<string, WorkspaceLabel[]>;
    activeFilterLabel: WorkspaceLabel | null;                // null if pref id is not in `labels`
    setActiveFilterLabelId: (id: string | null) => void;
    createLabel: (input: { name: string; color: string }) => Promise<WorkspaceLabel>;
    updateLabel: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
    deleteLabel: (id: string) => Promise<void>;              // also clears the filter when it was active
    setWorkspaceLabels: (workspaceId: string, labelIds: string[]) => Promise<void>;
  }
  export function useWorkspaceLabels(): UseWorkspaceLabelsResult
  // utils (pure, tested):
  export function indexLabelsByWorkspace(labels: WorkspaceLabel[], assignments: { workspaceId: string; labelId: string }[]): Map<string, WorkspaceLabel[]>
  export function resolveActiveFilterLabel(labels: WorkspaceLabel[], filterId: string | null): WorkspaceLabel | null
  ```

Query key `["workspace-labels", activeHostUrl]`, `enabled: activeHostUrl !== null`, `retry: 1`, `networkMode: "always"`. On error, the hook returns empty data (Review Focus 1). Each mutation invalidates the key on settle. Optimistic update for `setWorkspaceLabels` so checkbox toggles feel instant.

- [ ] **Step 1: Write failing util tests**

```ts
it("indexes labels per workspace in label order and skips unknown label ids", ...);
it("resolveActiveFilterLabel returns null for null or a deleted label id", () => {
  expect(resolveActiveFilterLabel([important], "gone")).toBeNull();
  expect(resolveActiveFilterLabel([important], null)).toBeNull();
  expect(resolveActiveFilterLabel([important], important.id)).toBe(important);
});
```

- [ ] **Step 2: Run, verify fail** — `cd apps/desktop && bun test src/renderer/hooks/workspace-labels` → FAIL.
- [ ] **Step 3: Implement utils, hook, preference field and setter.**
- [ ] **Step 4: Run, verify pass**; also `bun test src/renderer/lib/persisted-keys` → PASS (no new localStorage key; the field rides the existing preferences row).
- [ ] **Step 5: Commit** — `feat(desktop): read and write workspace labels from the local host`

---

### Task 4: Pure sidebar filter by label

**Files:**
- Create: `apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/utils/filterDashboardSidebarByLabel/filterDashboardSidebarByLabel.ts`
- Create: `.../filterDashboardSidebarByLabel/filterDashboardSidebarByLabel.test.ts`
- Create: `.../filterDashboardSidebarByLabel/index.ts`

**Interfaces:**
- Consumes: `DashboardSidebarProject`, `DashboardSidebarProjectChild`, `DashboardSidebarWorkspace`, `DashboardSidebarPinnedWorkspace` from `../../types`.
- Produces:
  ```ts
  export interface DashboardSidebarLabelFilterInput {
    projects: DashboardSidebarProject[];
    sessionChildren: DashboardSidebarProjectChild[];
    sessionWorkspaces: DashboardSidebarWorkspace[];
    pinnedWorkspaces: DashboardSidebarPinnedWorkspace[];
  }
  export function filterDashboardSidebarByLabel(
    input: DashboardSidebarLabelFilterInput,
    labelId: string | null,
    labelIdsByWorkspaceId: ReadonlyMap<string, ReadonlySet<string>>,
  ): DashboardSidebarLabelFilterInput
  ```

Rules: `labelId === null` returns `input` unchanged (same reference). A workspace matches when its id's set has `labelId`. Projects and sections are pruned like `filterDashboardSidebarProjects` (drop empty, force `isCollapsed: false` on survivors, keep references when unchanged). The section header is kept only with ≥ 1 match.

- [ ] **Step 1: Write failing tests**

```ts
it("returns the same object when no label is active", ...);
it("keeps only matching workspaces across several projects and drops empty projects", ...);
it("keeps a tag folder only when one of its members matches, expanded", ...);
it("filters Sessions children, the flat session list and Pinned", ...);
it("hides a non-matching active workspace like any other", ...);
```

- [ ] **Step 2: Run, verify fail** — `cd apps/desktop && bun test filterDashboardSidebarByLabel` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(desktop): filter the sidebar by workspace label`

---

### Task 5: Label pills, filter bar and label management UI

**Files** (all under `apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/`):
- Create: `WorkspaceLabelPill/WorkspaceLabelPill.tsx` + `index.ts` — `{ label: WorkspaceLabel; isActive?: boolean; size?: "sm" | "xs"; onClick?: () => void }`; background = `label.color`, readable text color, `isActive` adds a ring.
- Create: `DashboardSidebarLabelFilterBar/DashboardSidebarLabelFilterBar.tsx` + `index.ts` — row with an "All" pill then one `WorkspaceLabelPill` per label in a `DashboardSidebarChipStrip`; click toggles `setActiveFilterLabelId`; each label pill wrapped in a context menu: "Rename…", "Color" submenu (`PROJECT_COLORS`), "Delete".
- Create: `DashboardSidebarLabelFilterBar/components/WorkspaceLabelDialog/WorkspaceLabelDialog.tsx` + `index.ts` — name input + color swatches (reuse `renderer/components/ColorSelector` if its API fits, otherwise swatches from `PROJECT_COLORS`); used for "New label…" and "Rename…"; shows the `CONFLICT` error inline ("A label with this name already exists"). Promote it to `DashboardSidebar/components/` in Task 6 since the context menu also uses it.
- Modify: `DashboardSidebarWorkspaceItem/components/DashboardSidebarExpandedWorkspaceRow/DashboardSidebarExpandedWorkspaceRow.tsx` — render the workspace's pills (size `xs`) under the name, only for `hostType === "local-device"`. Labels come from a new prop `labels: WorkspaceLabel[]` passed by `DashboardSidebarWorkspaceItem`, which reads `labelsByWorkspaceId` from a context (next bullet), so rows do not each run the query.
- Create: `providers/DashboardSidebarLabelsProvider/DashboardSidebarLabelsProvider.tsx` + `index.ts` — calls `useWorkspaceLabels()` once and exposes its result via `useDashboardSidebarLabels()`.

**Interfaces:**
- Consumes: Task 3 `useWorkspaceLabels` result.
- Produces: `WorkspaceLabelPill`, `WorkspaceLabelDialog` (`{ open; onOpenChange; mode: "create" | "rename"; initial?: { name: string; color: string }; onSubmit(values): Promise<void> }`), `DashboardSidebarLabelsProvider`, `useDashboardSidebarLabels(): UseWorkspaceLabelsResult`.

- [ ] **Step 1:** Implement `DashboardSidebarLabelsProvider` and mount it in `DashboardSidebar.tsx` around the existing tree.
- [ ] **Step 2:** Implement `WorkspaceLabelPill` and render pills in the expanded row.
- [ ] **Step 3:** Implement `WorkspaceLabelDialog` and `DashboardSidebarLabelFilterBar`; mount the bar in `DashboardSidebar.tsx` just above `DashboardSidebarPinnedSection`, rendered only when `!isCollapsed && labels.length > 0`.
- [ ] **Step 4:** Deleting from the bar asks for confirmation in the app's dialog component (not `window.confirm`), then calls `deleteLabel`.
- [ ] **Step 5: Verify** — `cd apps/desktop && bun run typecheck` → no errors; `bun test DashboardSidebar` → PASS.
- [ ] **Step 6: Commit** — `feat(desktop): show workspace label pills and the label filter bar`

---

### Task 6: "Labels" submenu on the workspace context menu

**Files:**
- Modify: `.../DashboardSidebarWorkspaceItem/components/DashboardSidebarWorkspaceContextMenu/DashboardSidebarWorkspaceContextMenu.tsx`
- Move: `WorkspaceLabelDialog` to `DashboardSidebar/components/WorkspaceLabelDialog/` (now used by two components)

**Interfaces:**
- Consumes: `useDashboardSidebarLabels()`, `WorkspaceLabelDialog`.

Add a `ContextMenuSub` "Labels" after the pin item, only when `isLocalWorkspace`. Content: one `ContextMenuCheckboxItem` per label (pill-colored dot + name), checked when assigned; toggling calls `setWorkspaceLabels(workspaceId, nextIds)` and keeps the menu open (`onSelect={(e) => e.preventDefault()}`). Then a separator and "New label…", which opens `WorkspaceLabelDialog` in create mode via `runAfterClose`; on submit: `createLabel` then `setWorkspaceLabels(workspaceId, [...current, created.id])`.

- [ ] **Step 1:** Implement. Check `@superset/ui` exports `ContextMenuCheckboxItem`; if not, use `ContextMenuItem` with a check icon like the existing section items.
- [ ] **Step 2: Verify** — `cd apps/desktop && bun run typecheck` → no errors.
- [ ] **Step 3: Commit** — `feat(desktop): assign labels from the workspace context menu`

---

### Task 7: Apply the filter to the whole sidebar

**Files:**
- Modify: `apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/DashboardSidebar.tsx`

**Interfaces:**
- Consumes: `filterDashboardSidebarByLabel` (Task 4), `useDashboardSidebarLabels()` (Task 5).

Build `labelIdsByWorkspaceId` from `labelsByWorkspaceId`. Apply the label filter to `sortedGroups` **before** `filterDashboardSidebarProjects` (text search narrows inside the label view), and to `sessionChildren`, `sessionWorkspaces`, `pinnedWorkspaces`; pass the filtered values everywhere the originals went (`DashboardSidebarDndProvider`, Pinned, Sessions, shortcuts, `selectableWorkspaceIds`). Treat an active label like an active text filter for drag (`isProjectDragDisabled`, `isChildDragDisabled`, `useBlockedDragNotice` with `onClearFilter` clearing both). Hide `DashboardSidebarCloudSection` while a label is active. When nothing matches, show "No workspaces have the label {name}" in the existing empty-state slot.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** — `cd apps/desktop && bun run typecheck && bun test DashboardSidebar` → PASS.
- [ ] **Step 3: Commit** — `feat(desktop): filter every sidebar section by the active label`

---

### Task 8: Label picker in the new-workspace dialog

**Files:**
- Modify: `apps/desktop/src/renderer/components/NewWorkspaceModal/NewWorkspaceModalDraftContext.tsx` (add `labelIds: string[]`, default `[]`, reset with the draft)
- Create: `apps/desktop/src/renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/components/DashboardNewWorkspaceForm/components/LabelPickerPill/LabelPickerPill.tsx` + `index.ts` — a pill-style trigger next to the other picker pills (`ProjectPickerPill`, `EnvironmentPickerPill`) opening a checkbox list of labels plus "New label…"
- Modify: `.../PromptGroup/hooks/useSubmitWorkspace/useSubmitWorkspace.ts` — in the non-cloud branch, inside `completed.then`, when `outcome.ok && draft.labelIds.length > 0 && hostId === machineId`, call `setWorkspaceLabels(outcome.workspaceId, draft.labelIds)`; a failure logs and does not block navigation.

**Interfaces:**
- Consumes: `useWorkspaceLabels()` (Task 3; the modal is outside the sidebar provider, so it calls the hook directly — same query key, shared cache), `WorkspaceLabelDialog`, `WorkspaceLabelPill`.

The pill renders only when the selected host is the local machine (`(draft.hostId ?? machineId) === machineId`).

- [ ] **Step 1:** Implement draft field, pill, submit hook change.
- [ ] **Step 2: Verify** — `cd apps/desktop && bun run typecheck` → no errors.
- [ ] **Step 3: Commit** — `feat(desktop): pick labels when creating a workspace`

---

### Task 9: Translations, full checks and app verification

- [ ] **Step 1:** `bun run check:i18n`; write every listed message into each `locales/<locale>/messages.po`; rerun until it lists nothing.
- [ ] **Step 2:** Run the `ci-check` skill (lint:fix, typecheck, test, check:i18n, sherif). Expected: all green.
- [ ] **Step 3:** Verify in the running app with the `cdp-verification` skill: create "important" and "feature-x"; put "feature-x" on one workspace in two different projects; click "feature-x" in the bar → only those two rows remain, other projects and Cloud gone; restart the app → filter still on; delete "feature-x" → filter off, pills gone. Capture screenshots as evidence.
- [ ] **Step 4: Commit** — `chore(i18n): translate workspace label strings`
