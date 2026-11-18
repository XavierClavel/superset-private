import { basename } from "node:path";
import { projects } from "../../../../db/schema";
import {
	emitProjectChanged,
	getProjectIncludingDeleted,
} from "../../../../projects/local-project-store";
import type { HostServiceContext } from "../../../../types";
import { seedProjectTrust } from "../../workspace-creation/shared/seed-agent-trust";
import type { ResolvedRepo } from "./resolve-repo";

export interface ProjectIdentityFields {
	name?: string;
}

export async function persistLocalProject(
	ctx: HostServiceContext,
	projectId: string,
	resolved: ResolvedRepo,
	identity?: ProjectIdentityFields,
): Promise<void> {
	const existing = getProjectIncludingDeleted(ctx.db, projectId);
	const repoFields = {
		repoPath: resolved.repoPath,
		repoProvider: resolved.parsed ? ("github" as const) : null,
		repoOwner: resolved.parsed?.owner ?? null,
		repoName: resolved.parsed?.name ?? null,
		repoUrl: resolved.parsed?.url ?? null,
		remoteName: resolved.remoteName,
	};
	const identityFields = {
		name: identity?.name ?? existing?.name ?? basename(resolved.repoPath),
		updatedAt: Date.now(),
	};
	ctx.db
		.insert(projects)
		.values({ id: projectId, ...repoFields, ...identityFields })
		.onConflictDoUpdate({
			target: projects.id,
			set: { ...repoFields, ...identityFields },
		})
		.run();
	const row = getProjectIncludingDeleted(ctx.db, projectId);
	if (row) {
		emitProjectChanged(ctx.eventBus, existing ? "updated" : "created", row);
	}
	await seedProjectTrust(ctx.db, resolved.repoPath);
}
