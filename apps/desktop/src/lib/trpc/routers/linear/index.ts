import { LinearClient } from "@linear/sdk";
import { msg } from "@lingui/core/macro";
import { taskPriorityValues } from "@superset/db/enums";
import { i18n } from "@superset/i18n";
import {
	createIssue,
	getIssue,
	getWorkspace,
	issueFilterFor,
	linearStatusFilterValues,
	listIssues,
	updateIssue,
} from "@superset/trpc/linear-api";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import {
	createLinearApiKeyStore,
	type LinearApiKeyStore,
} from "./utils/api-key-store";

/**
 * Linear with a personal API key kept on this machine, for organizations
 * whose plan has no cloud Linear connection. The key stays in the main process.
 */
export function createLinearRouter(
	keyStore: LinearApiKeyStore = createLinearApiKeyStore(),
	clientFor: (apiKey: string) => LinearClient = (apiKey) =>
		new LinearClient({ apiKey }),
) {
	async function withLinear<T>(
		run: (client: LinearClient) => Promise<T>,
	): Promise<T> {
		const apiKey = await keyStore.load();
		if (!apiKey) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: i18n._(
					msg({ message: "Add a Linear API key in Settings > Integrations." }),
				),
			});
		}
		return run(clientFor(apiKey));
	}

	return router({
		status: publicProcedure.query(async () => ({
			connected: !!(await keyStore.load()),
		})),

		setApiKey: publicProcedure
			.input(z.object({ apiKey: z.string().trim().min(1) }))
			.mutation(async ({ input }) => {
				try {
					await clientFor(input.apiKey).viewer;
				} catch (error) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: i18n._(msg({ message: "Linear rejected this API key." })),
						cause: error,
					});
				}
				await keyStore.save(input.apiKey);
			}),

		clearApiKey: publicProcedure.mutation(() => keyStore.clear()),

		workspace: publicProcedure.query(() => withLinear(getWorkspace)),

		issues: publicProcedure
			.input(
				z.object({
					teamId: z.string().nullish(),
					projectId: z.string().nullish(),
					status: z.enum(linearStatusFilterValues).default("active"),
					assignee: z.string().nullish(),
					search: z.string().trim().max(200).nullish(),
					cursor: z.string().nullish(),
				}),
			)
			.query(({ input }) =>
				withLinear((client) =>
					listIssues(client, {
						filter: issueFilterFor(input),
						cursor: input.cursor ?? undefined,
						search: input.search || undefined,
					}),
				),
			),

		issue: publicProcedure
			.input(z.object({ issueId: z.string().min(1) }))
			.query(({ input }) =>
				withLinear((client) => getIssue(client, input.issueId)),
			),

		updateIssue: publicProcedure
			.input(
				z.object({
					issueId: z.string().min(1),
					stateId: z.string().optional(),
					priority: z.enum(taskPriorityValues).optional(),
					assigneeId: z.string().nullable().optional(),
				}),
			)
			.mutation(({ input }) => {
				const { issueId, ...changes } = input;
				return withLinear((client) => updateIssue(client, issueId, changes));
			}),

		createIssue: publicProcedure
			.input(
				z.object({
					teamId: z.string().min(1),
					title: z.string().trim().min(1),
					description: z.string().optional(),
					stateId: z.string().optional(),
					priority: z.enum(taskPriorityValues).optional(),
					assigneeId: z.string().optional(),
				}),
			)
			.mutation(({ input }) =>
				withLinear((client) => createIssue(client, input)),
			),
	});
}
