import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLinearApiKeyStore } from "./api-key-store";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-api-key-test-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("Linear API key store", () => {
	test("keeps the key encrypted on disk across restarts until cleared", async () => {
		const file = path.join(dir, "linear-api-key.enc");
		const apiKey = "lin_api_secret";

		expect(await createLinearApiKeyStore(file).load()).toBeNull();

		await createLinearApiKeyStore(file).save(apiKey);
		expect(fs.readFileSync(file).includes(apiKey)).toBe(false);
		expect(fs.statSync(file).mode & 0o777).toBe(0o600);

		const afterRestart = createLinearApiKeyStore(file);
		expect(await afterRestart.load()).toBe(apiKey);

		await afterRestart.clear();
		expect(await afterRestart.load()).toBeNull();
		expect(await createLinearApiKeyStore(file).load()).toBeNull();
	});
});
