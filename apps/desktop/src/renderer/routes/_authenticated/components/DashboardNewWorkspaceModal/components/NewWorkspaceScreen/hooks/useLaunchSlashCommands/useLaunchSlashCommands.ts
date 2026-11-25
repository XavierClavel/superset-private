import type { PromptInputCommand } from "@superset/chat-ui/PromptInput";
import type { SlashCommand } from "@superset/shared/slash-commands";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { commandChip } from "renderer/routes/_authenticated/components/AgentComposer/utils/commandChip";

const NO_COMMANDS: SlashCommand[] = [];

export function toLaunchMenuCommands(
	commands: SlashCommand[],
): PromptInputCommand[] {
	return commands
		.filter((command) => command.kind === "custom")
		.map((command) => ({
			id: command.name,
			title: `/${command.name}`,
			...(command.argumentHint ? { hint: command.argumentHint } : {}),
			description: command.description,
			searchAliases: command.aliases,
			onSelect: (ctx) => {
				ctx.insertChip(commandChip(command.name, command.description));
			},
		}));
}

/**
 * The skills and custom commands the agent can run where the workspace will
 * start, for the first prompt's `/` menu. A host too old to have the
 * procedure, or offline, gives no menu.
 */
export function useLaunchSlashCommands({
	hostUrl,
	projectId,
	isSession,
	agent,
}: {
	hostUrl: string | null;
	projectId: string | null;
	isSession: boolean;
	agent: string | null;
}): PromptInputCommand[] {
	const enabled = Boolean(hostUrl && agent && (projectId || isSession));
	const { data = NO_COMMANDS } = useQuery({
		queryKey: [
			"host-agent-tooling",
			"listLaunchSlashCommands",
			hostUrl,
			projectId,
			agent,
		],
		queryFn: () =>
			hostUrl && agent
				? getHostServiceClientByUrl(
						hostUrl,
					).agentTooling.listLaunchSlashCommands.query({
						projectId: projectId ?? undefined,
						agent,
					})
				: NO_COMMANDS,
		enabled,
	});
	return useMemo(() => toLaunchMenuCommands(data), [data]);
}
