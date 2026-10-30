import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runMigrations } from "@superset/shared/sqlite-migrations";
import { drizzle } from "drizzle-orm/bun-sqlite";

/**
 * This fork's workspace-labels migration was generated before upstream's
 * 0038_mobile_devices merged, but carries a later `when`. Builds of the fork
 * from before the rebase shipped labels as 0038 without mobile_devices, so
 * their databases hold a `created_at` above mobile_devices'. The runner keys
 * on the set of applied `created_at`, so it must still apply mobile_devices
 * there, and must not run the labels migration a second time.
 */

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../drizzle");
const UPSTREAM_MIGRATION = "0038_mobile_devices";
const FORK_MIGRATION = "0039_shiny_veda";

type JournalEntry = { idx: number; version: string; when: number; tag: string };

function readEntries(): JournalEntry[] {
	return (
		JSON.parse(
			readFileSync(join(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8"),
		) as { entries: JournalEntry[] }
	).entries;
}

const tempDirs: string[] = [];

/** The migrations a pre-rebase fork build shipped: upstream's 0038 missing. */
function preRebaseForkFolder(): string {
	const entries = readEntries();
	const end = entries.findIndex((entry) => entry.tag === FORK_MIGRATION);
	expect(end).toBeGreaterThan(-1);
	const shipped = entries
		.slice(0, end + 1)
		.filter((entry) => entry.tag !== UPSTREAM_MIGRATION);

	const dir = mkdtempSync(join(tmpdir(), "host-fork-migrations-"));
	tempDirs.push(dir);
	mkdirSync(join(dir, "meta"));
	for (const entry of shipped) {
		copyFileSync(
			join(MIGRATIONS_FOLDER, `${entry.tag}.sql`),
			join(dir, `${entry.tag}.sql`),
		);
	}
	writeFileSync(
		join(dir, "meta/_journal.json"),
		JSON.stringify({ version: "7", dialect: "sqlite", entries: shipped }),
	);
	return dir;
}

function tables(sqlite: Database): string[] {
	return (
		sqlite
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
			.all() as { name: string }[]
	).map((row) => row.name);
}

describe("host.db migrations of this fork", () => {
	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("the labels migration is dated after upstream's mobile_devices", () => {
		const entries = readEntries();
		const upstream = entries.find((entry) => entry.tag === UPSTREAM_MIGRATION);
		const fork = entries.find((entry) => entry.tag === FORK_MIGRATION);
		expect(upstream && fork && fork.when > upstream.when).toBe(true);
	});

	test("a database from a pre-rebase fork build gets the mobile tables", () => {
		const sqlite = new Database(":memory:");
		sqlite.exec("PRAGMA foreign_keys = OFF");
		runMigrations(drizzle(sqlite), preRebaseForkFolder());
		sqlite
			.prepare(
				"INSERT INTO workspace_labels (id, name, name_key, color, sort_order, created_at) VALUES ('l1', 'Urgent', 'urgent', '#f00', 0, 0)",
			)
			.run();
		expect(tables(sqlite)).not.toContain("mobile_owned_devices");

		runMigrations(drizzle(sqlite), MIGRATIONS_FOLDER);

		expect(tables(sqlite)).toContain("mobile_last_devices");
		expect(tables(sqlite)).toContain("mobile_owned_devices");
		// The labels migration did not run again: its table and rows are intact.
		expect(sqlite.prepare("SELECT id FROM workspace_labels").all()).toEqual([
			{ id: "l1" },
		]);
	});
});
