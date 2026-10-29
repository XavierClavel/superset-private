import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../../../db/schema";
import type { HostServiceContext } from "../../../types";
import { workspaceLabelsRouter } from "./workspace-labels";

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../../../drizzle");
const MISSING_WORKSPACE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function createCaller() {
	const sqlite = new Database(":memory:");
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	const ctx = {
		db,
		isAuthenticated: true,
		userId: "alice",
	} as unknown as HostServiceContext;
	return workspaceLabelsRouter.createCaller(ctx);
}

describe("workspaceLabelsRouter", () => {
	it("lists a created label", async () => {
		const caller = createCaller();
		const created = await caller.create({ name: " Urgent ", color: "red" });
		expect(created.name).toBe("Urgent");
		const listed = await caller.list();
		expect(listed.labels).toEqual([created]);
		expect(listed.assignments).toEqual([]);
	});

	it("rejects a duplicate name with CONFLICT", async () => {
		const caller = createCaller();
		await caller.create({ name: "Urgent", color: "red" });
		await expect(
			caller.create({ name: "urgent", color: "blue" }),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("rejects an unknown workspace with NOT_FOUND", async () => {
		const caller = createCaller();
		await expect(
			caller.setForWorkspace({ workspaceId: MISSING_WORKSPACE, labelIds: [] }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rejects a blank or oversized name with BAD_REQUEST", async () => {
		const caller = createCaller();
		await expect(
			caller.create({ name: "   ", color: "red" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			caller.create({ name: "x".repeat(41), color: "red" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("updates and deletes a label", async () => {
		const caller = createCaller();
		const created = await caller.create({ name: "A", color: "red" });
		const updated = await caller.update({ id: created.id, color: "blue" });
		expect(updated.color).toBe("blue");
		expect(await caller.delete({ id: created.id })).toEqual({ success: true });
		await expect(caller.delete({ id: created.id })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});
