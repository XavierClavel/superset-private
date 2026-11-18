import { describe, expect, test } from "bun:test";
import type { LinearClient } from "@linear/sdk";
import { createLinearRouter } from ".";
import type { LinearApiKeyStore } from "./utils/api-key-store";

const VALID_KEY = "lin_api_valid";

function memoryStore(): LinearApiKeyStore {
	let saved: string | null = null;
	return {
		load: async () => saved,
		save: async (apiKey) => {
			saved = apiKey;
		},
		clear: async () => {
			saved = null;
		},
	};
}

function caller() {
	const keysUsed: string[] = [];
	const requests: Array<Record<string, unknown>> = [];
	const router = createLinearRouter(memoryStore(), (apiKey) => {
		keysUsed.push(apiKey);
		return {
			get viewer() {
				return apiKey === VALID_KEY
					? Promise.resolve({ id: "viewer" })
					: Promise.reject(new Error("Authentication required"));
			},
			client: {
				rawRequest: async (
					_query: string,
					variables: Record<string, unknown>,
				) => {
					requests.push(variables);
					return {
						data: {
							teams: { nodes: [] },
							users: { nodes: [] },
							issues: {
								nodes: [],
								pageInfo: { hasNextPage: false, endCursor: null },
							},
						},
					};
				},
			},
		} as unknown as LinearClient;
	});
	return { keysUsed, requests, call: router.createCaller({} as never) };
}

describe("Linear with a local API key", () => {
	test("without a key, asks for one instead of calling Linear", async () => {
		const { call, keysUsed } = caller();
		expect(await call.status()).toEqual({ connected: false });
		await expect(call.workspace()).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
		expect(keysUsed).toEqual([]);
	});

	test("a key Linear rejects is not saved", async () => {
		const { call } = caller();
		await expect(
			call.setApiKey({ apiKey: "lin_api_revoked" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(await call.status()).toEqual({ connected: false });
	});

	test("calls Linear with the saved key until it is removed", async () => {
		const { call, keysUsed } = caller();
		await call.setApiKey({ apiKey: ` ${VALID_KEY} ` });
		expect(await call.status()).toEqual({ connected: true });

		await call.workspace();
		expect(keysUsed.at(-1)).toBe(VALID_KEY);

		await call.clearApiKey();
		expect(await call.status()).toEqual({ connected: false });
		await expect(call.workspace()).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
	});

	test("lists the issues of every selected status", async () => {
		const { call, requests } = caller();
		await call.setApiKey({ apiKey: VALID_KEY });
		const statuses = ["unstarted", "completed"] as const;

		await call.issues({ statuses: [...statuses] });

		expect(requests.at(-1)?.filter).toEqual({
			state: { type: { in: [...statuses] } },
		});
	});
});
