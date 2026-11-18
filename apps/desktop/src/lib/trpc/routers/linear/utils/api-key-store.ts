import fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { decrypt, encrypt } from "@superset/shared/auth-token-crypto";
import {
	SUPERSET_HOME_DIR,
	SUPERSET_HOME_DIR_MODE,
	SUPERSET_SENSITIVE_FILE_MODE,
} from "main/lib/app-environment";

export interface LinearApiKeyStore {
	load(): Promise<string | null>;
	save(apiKey: string): Promise<void>;
	clear(): Promise<void>;
}

/** One Linear personal API key per machine, encrypted with the machine key. */
export function createLinearApiKeyStore(
	file = join(SUPERSET_HOME_DIR, "linear-api-key.enc"),
): LinearApiKeyStore {
	// Decryption runs scrypt synchronously, so it happens once per process.
	let cached: string | null | undefined;

	return {
		async load() {
			if (cached !== undefined) return cached;
			try {
				cached = decrypt(await fs.readFile(file));
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
				cached = null;
			}
			return cached;
		},

		async save(apiKey) {
			await fs.mkdir(dirname(file), {
				recursive: true,
				mode: SUPERSET_HOME_DIR_MODE,
			});
			await fs.writeFile(file, encrypt(apiKey), {
				mode: SUPERSET_SENSITIVE_FILE_MODE,
			});
			cached = apiKey;
		},

		async clear() {
			await fs.rm(file, { force: true });
			cached = null;
		},
	};
}
