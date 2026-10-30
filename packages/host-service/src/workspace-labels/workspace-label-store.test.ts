import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { HostDb } from "../db";
import * as schema from "../db/schema";
import { projects, workspaces } from "../db/schema";
import {
	createWorkspaceLabel,
	deleteWorkspaceLabel,
	listWorkspaceLabels,
	setWorkspaceLabels,
	updateWorkspaceLabel,
	WorkspaceLabelNameConflictError,
	WorkspaceLabelNotFoundError,
} from "./workspace-label-store";

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../drizzle");
const PROJECT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WS_1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const WS_2 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createHarness() {
	const sqlite = new Database(":memory:");
	sqlite.run("PRAGMA foreign_keys = ON");
	const rawDb = drizzle(sqlite, { schema });
	migrate(rawDb, { migrationsFolder: MIGRATIONS_FOLDER });
	const db = rawDb as unknown as HostDb;
	db.insert(projects)
		.values({ id: PROJECT, repoPath: "/tmp/repo", createdAt: 1 })
		.run();
	for (const id of [WS_1, WS_2]) {
		db.insert(workspaces)
			.values({
				id,
				projectId: PROJECT,
				worktreePath: `/tmp/${id}`,
				branch: id,
				name: id,
			})
			.run();
	}
	return {
		db,
		alice: { db, userId: "alice" },
		bob: { db, userId: "bob" },
	};
}

describe("workspace label store", () => {
	it("creates labels in order and lists them for their owner only", () => {
		const { alice, bob } = createHarness();
		createWorkspaceLabel(alice, { name: " Important ", color: "#ef4444" });
		createWorkspaceLabel(alice, { name: "feature-x", color: "#3b82f6" });
		createWorkspaceLabel(bob, { name: "mine", color: "#22c55e" });
		expect(
			listWorkspaceLabels(alice).labels.map((l) => [l.name, l.sortOrder]),
		).toEqual([
			["Important", 0],
			["feature-x", 1],
		]);
	});

	it("rejects an empty or too long name", () => {
		const { alice } = createHarness();
		expect(() =>
			createWorkspaceLabel(alice, { name: "  ", color: "#000" }),
		).toThrow();
		expect(() =>
			createWorkspaceLabel(alice, { name: "x".repeat(41), color: "#000" }),
		).toThrow();
		expect(() =>
			createWorkspaceLabel(alice, { name: "x".repeat(40), color: "#000" }),
		).not.toThrow();
	});

	it("rejects a duplicate name ignoring case and spaces, per user", () => {
		const { alice, bob } = createHarness();
		createWorkspaceLabel(alice, { name: "Important", color: "#ef4444" });
		expect(() =>
			createWorkspaceLabel(alice, { name: " important", color: "#000" }),
		).toThrow(WorkspaceLabelNameConflictError);
		expect(() =>
			createWorkspaceLabel(bob, { name: "important", color: "#000" }),
		).not.toThrow();
	});

	it("rename to an existing name conflicts; rename to same name with new case passes", () => {
		const { alice } = createHarness();
		const a = createWorkspaceLabel(alice, { name: "A", color: "#111" });
		createWorkspaceLabel(alice, { name: "B", color: "#222" });
		expect(() => updateWorkspaceLabel(alice, a.id, { name: "b" })).toThrow(
			WorkspaceLabelNameConflictError,
		);
		expect(
			updateWorkspaceLabel(alice, a.id, { name: "a", color: "#333" }),
		).toMatchObject({
			name: "a",
			color: "#333",
		});
	});

	it("setWorkspaceLabels replaces the set and keeps other users' assignments", () => {
		const { alice, bob } = createHarness();
		const a1 = createWorkspaceLabel(alice, { name: "a1", color: "#1" });
		const a2 = createWorkspaceLabel(alice, { name: "a2", color: "#2" });
		const b1 = createWorkspaceLabel(bob, { name: "b1", color: "#3" });
		setWorkspaceLabels(bob, WS_1, [b1.id]);
		setWorkspaceLabels(alice, WS_1, [a1.id]);
		expect(setWorkspaceLabels(alice, WS_1, [a2.id])).toEqual([
			{ workspaceId: WS_1, labelId: a2.id },
		]);
		expect(listWorkspaceLabels(alice).assignments).toEqual([
			{ workspaceId: WS_1, labelId: a2.id },
		]);
		expect(listWorkspaceLabels(bob).assignments).toEqual([
			{ workspaceId: WS_1, labelId: b1.id },
		]);
	});

	it("setWorkspaceLabels rejects another user's label and an unknown workspace", () => {
		const { alice, bob } = createHarness();
		const aliceLabel = createWorkspaceLabel(alice, { name: "a", color: "#1" });
		const bobLabel = createWorkspaceLabel(bob, { name: "b", color: "#2" });
		expect(() => setWorkspaceLabels(alice, WS_1, [bobLabel.id])).toThrow(
			WorkspaceLabelNotFoundError,
		);
		expect(() => setWorkspaceLabels(alice, "nope", [aliceLabel.id])).toThrow(
			WorkspaceLabelNotFoundError,
		);
		expect(listWorkspaceLabels(alice).assignments).toEqual([]);
	});

	it("deleting a label removes its assignments", () => {
		const { alice, db } = createHarness();
		const a = createWorkspaceLabel(alice, { name: "a", color: "#1" });
		setWorkspaceLabels(alice, WS_1, [a.id]);
		deleteWorkspaceLabel(alice, a.id);
		expect(listWorkspaceLabels(alice)).toEqual({ labels: [], assignments: [] });
		expect(db.select().from(schema.workspaceLabelAssignments).all()).toEqual(
			[],
		);
	});

	it("deleting a workspace row removes its assignments", () => {
		const { alice, db } = createHarness();
		const a = createWorkspaceLabel(alice, { name: "a", color: "#1" });
		setWorkspaceLabels(alice, WS_1, [a.id]);
		db.delete(workspaces).where(eq(workspaces.id, WS_1)).run();
		expect(listWorkspaceLabels(alice).assignments).toEqual([]);
		expect(db.select().from(schema.workspaceLabelAssignments).all()).toEqual(
			[],
		);
	});

	it("hides assignments on archived workspaces", () => {
		const { alice, db } = createHarness();
		const a = createWorkspaceLabel(alice, { name: "a", color: "#1" });
		setWorkspaceLabels(alice, WS_1, [a.id]);
		setWorkspaceLabels(alice, WS_2, [a.id]);
		db.update(workspaces)
			.set({ archivedAt: 5 })
			.where(eq(workspaces.id, WS_1))
			.run();
		expect(listWorkspaceLabels(alice).assignments).toEqual([
			{ workspaceId: WS_2, labelId: a.id },
		]);
	});

	it("update/delete of another user's label throws WorkspaceLabelNotFoundError", () => {
		const { alice, bob } = createHarness();
		const b = createWorkspaceLabel(bob, { name: "b", color: "#1" });
		expect(() => updateWorkspaceLabel(alice, b.id, { name: "x" })).toThrow(
			WorkspaceLabelNotFoundError,
		);
		expect(() => deleteWorkspaceLabel(alice, b.id)).toThrow(
			WorkspaceLabelNotFoundError,
		);
		expect(listWorkspaceLabels(bob).labels).toHaveLength(1);
	});

	it("treats a null user as the empty owner", () => {
		const { db } = createHarness();
		const anon = { db, userId: null };
		createWorkspaceLabel(anon, { name: "a", color: "#1" });
		expect(listWorkspaceLabels(anon).labels).toHaveLength(1);
		expect(listWorkspaceLabels({ db, userId: "alice" }).labels).toEqual([]);
	});
});
