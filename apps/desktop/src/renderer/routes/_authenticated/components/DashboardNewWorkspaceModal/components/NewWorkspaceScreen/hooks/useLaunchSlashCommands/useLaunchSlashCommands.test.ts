import { describe, expect, it } from "bun:test";
import type { ComposerChip } from "@superset/chat-ui/PromptInput";
import type { SlashCommand } from "@superset/shared/slash-commands";
import { toLaunchMenuCommands } from "./useLaunchSlashCommands";

function slashCommand(name: string, kind: SlashCommand["kind"]): SlashCommand {
	return {
		name,
		aliases: [],
		description: `${name} description`,
		argumentHint: "",
		kind,
		source: kind === "builtin" ? "builtin" : "global",
		entryKind: kind === "builtin" ? "command" : "skill",
		trigger: "/",
	};
}

describe("toLaunchMenuCommands", () => {
	it("offers the agent's skills and leaves its builtins out", () => {
		const skill = slashCommand("quality:quality-gate", "custom");
		const menu = toLaunchMenuCommands([
			skill,
			slashCommand("compact", "builtin"),
		]);
		expect(menu.map((command) => command.title)).toEqual([`/${skill.name}`]);
	});

	it("inserts a chip the agent receives as the slash command", () => {
		const skill = slashCommand("review-metrics", "custom");
		const inserted: ComposerChip[] = [];
		const [command] = toLaunchMenuCommands([skill]);
		command?.onSelect({
			insertChip: (chip) => {
				inserted.push(chip);
			},
			attachFiles: () => {},
			openPanel: () => {},
			query: "",
		});
		expect(inserted.map((chip) => chip.serialized)).toEqual([`/${skill.name}`]);
	});
});
