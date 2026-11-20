import { describe, expect, test } from "bun:test";
import { jobIdFor } from "./job-id";

describe("jobIdFor", () => {
	test("turns a name into the id form Claude Jobs accepts", () => {
		expect(jobIdFor("📖 Photobook monitor", [])).toBe("photobook-monitor");
		expect(jobIdFor("Prépa réunions", [])).toBe("prepa-reunions");
		expect(jobIdFor("🗄️", [])).toBe("job");
	});

	test("keeps an id within 40 characters, suffix included", () => {
		const name = "a very long name that goes well past forty characters";
		const id = jobIdFor(name, []);
		expect(id.length).toBeLessThanOrEqual(40);
		expect(name.toLowerCase().replaceAll(" ", "-").startsWith(id)).toBe(true);
		const next = jobIdFor(name, [id]);
		expect(next.length).toBeLessThanOrEqual(40);
		expect(next.endsWith("-2")).toBe(true);
	});

	test("never reuses an id that is taken", () => {
		expect(jobIdFor("Daily report", ["daily-report", "daily-report-2"])).toBe(
			"daily-report-3",
		);
	});
});
