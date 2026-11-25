import { listClaudeArtifacts } from "@superset/agent-setup/claude-artifacts";
import { publicProcedure, router } from "..";

export const createClaudeArtifactsRouter = () =>
	router({
		list: publicProcedure.query(() => listClaudeArtifacts()),
	});
