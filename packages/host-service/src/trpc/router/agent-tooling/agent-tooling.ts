import { homedir } from "node:os";
import { join } from "node:path";
import type { McpServerEntry } from "@superset/shared/mcp-servers";
import type { SlashCommand } from "@superset/shared/slash-commands";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { buildChatAgentEnv } from "../../../chat-v3/agentEnv";
import { workspaces } from "../../../db/schema";
import { getLocalProject } from "../../../projects/local-project-store";
import { resolveHostAgentConfig } from "../../../terminal-agents/agent-config";
import type { HostServiceContext } from "../../../types";
import { queryProcedure, router } from "../../index";
import { resolveDefaultAccountEnv } from "../usage/default-account";
import { defaultSessionsRoot } from "../workspace-creation/shared/session-paths";
import { listAgentSlashCommands } from "./discovery";
import { isMcpServerAgent, listMcpServers } from "./mcp-servers";

// Declaration emit (docs/interim-router-types.md): the procedure's return
// type must be nameable from dist-types, and shared is runtime-neutral so
// mobile can resolve it.
export type { McpServerEntry } from "@superset/shared/mcp-servers";
export type { SlashCommand } from "@superset/shared/slash-commands";

function listSlashCommandsIn(
	ctx: HostServiceContext,
	worktreePath: string,
	agent: string,
): Promise<SlashCommand[]> {
	const config = resolveHostAgentConfig(ctx.db, agent);
	const presetId = config?.presetId ?? agent;
	// Same precedence as the agent launch itself: the config's own env
	// wins over the host-default account, so discovery reads the config
	// dir the CLI will actually run with.
	const env = {
		...resolveDefaultAccountEnv(ctx.db, presetId),
		...(config?.env ?? {}),
	};
	return listAgentSlashCommands({
		worktreePath,
		agentId: agent,
		presetId,
		env,
	});
}

function findWorkspace(ctx: HostServiceContext, workspaceId: string) {
	const workspace = ctx.db.query.workspaces
		.findFirst({ where: eq(workspaces.id, workspaceId) })
		.sync();
	if (!workspace) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Workspace ${workspaceId} not found on this host`,
		});
	}
	return workspace;
}

export const agentToolingRouter = router({
	/**
	 * The slash commands and skills the given agent can use in this
	 * workspace. `agent` is a presetId ("claude") or a hostAgentConfigs
	 * instance UUID; agents without discovery support return an empty list,
	 * which composers read as "no menu".
	 */
	listSlashCommands: queryProcedure
		.input(z.object({ workspaceId: z.string(), agent: z.string() }))
		.query(async ({ ctx, input }): Promise<SlashCommand[]> => {
			const workspace = findWorkspace(ctx, input.workspaceId);
			return listSlashCommandsIn(ctx, workspace.worktreePath, input.agent);
		}),

	/**
	 * The slash commands and skills the given agent can use in a workspace
	 * not created yet: the project's repository, or with no project, a fresh
	 * session folder that holds none of its own.
	 */
	listLaunchSlashCommands: queryProcedure
		.input(z.object({ projectId: z.string().optional(), agent: z.string() }))
		.query(async ({ ctx, input }): Promise<SlashCommand[]> => {
			if (!input.projectId)
				return listSlashCommandsIn(ctx, defaultSessionsRoot(), input.agent);
			const project = getLocalProject(ctx.db, input.projectId);
			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `Project ${input.projectId} not found on this host`,
				});
			}
			return listSlashCommandsIn(ctx, project.repoPath, input.agent);
		}),

	listMcpServers: queryProcedure
		.input(
			z.object({
				workspaceId: z.string(),
				agent: z.string(),
				refresh: z.boolean().optional(),
			}),
		)
		.query(
			async ({
				ctx,
				input,
			}): Promise<{ servers: McpServerEntry[]; supported: boolean }> => {
				const workspace = findWorkspace(ctx, input.workspaceId);
				const config = resolveHostAgentConfig(ctx.db, input.agent);
				const presetId = config?.presetId ?? input.agent;
				if (!isMcpServerAgent(presetId))
					return { servers: [], supported: false };
				const home = homedir();
				const env = await buildChatAgentEnv({
					db: ctx.db,
					cwd: workspace.worktreePath,
					workspaceId: input.workspaceId,
				});
				const claudeDir = env.CLAUDE_CONFIG_DIR?.trim();
				const codexHome = env.CODEX_HOME?.trim();
				const servers = await listMcpServers({
					worktreePath: workspace.worktreePath,
					agent: presetId,
					refresh: input.refresh,
					paths: {
						homeDir: home,
						claudeStatePath: claudeDir
							? join(claudeDir, ".claude.json")
							: join(home, ".claude.json"),
						codexConfigPath: join(
							codexHome || join(home, ".codex"),
							"config.toml",
						),
					},
				});
				return { servers, supported: true };
			},
		),
});
