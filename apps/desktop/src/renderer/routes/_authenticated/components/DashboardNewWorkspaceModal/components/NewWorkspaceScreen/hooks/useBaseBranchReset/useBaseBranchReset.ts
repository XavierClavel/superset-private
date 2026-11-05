import { useEffect, useRef } from "react";
import type { NewWorkspaceDraft } from "renderer/stores/new-workspace-draft";
import { useWorkspaceCreateDefaultsStore } from "renderer/stores/workspace-create-defaults";

interface Options {
	/** What the base branch is remembered under: the project, or on the cloud the environment. */
	branchDefaultKey: string | null;
	hostId: string | null;
	updateDraft: (
		patch: Pick<NewWorkspaceDraft, "baseBranch" | "baseBranchSource">,
	) => void;
}

/**
 * Sets the draft's base branch to the user's last pick for what the
 * workspace branches from, on mount and on every change of it or of the
 * host. The draft store is global and entry points (the sidebar's "+")
 * select the project before this screen mounts, so a base left over from
 * another project would otherwise ride into the create, and the host,
 * finding no such branch in this repository, would fork from its HEAD.
 */
export function useBaseBranchReset({
	branchDefaultKey,
	hostId,
	updateDraft,
}: Options) {
	const persistedDefault = useWorkspaceCreateDefaultsStore((state) =>
		branchDefaultKey
			? (state.baseBranchesByProjectId[branchDefaultKey] ?? null)
			: null,
	);
	const seededForRef = useRef<{
		branchDefaultKey: string | null;
		hostId: string | null;
	} | null>(null);
	useEffect(() => {
		const seededFor = seededForRef.current;
		if (
			seededFor?.branchDefaultKey === branchDefaultKey &&
			seededFor.hostId === hostId
		) {
			return;
		}
		seededForRef.current = { branchDefaultKey, hostId };
		updateDraft({
			baseBranch: persistedDefault?.branchName ?? null,
			baseBranchSource: persistedDefault?.source ?? null,
		});
	}, [branchDefaultKey, hostId, persistedDefault, updateDraft]);
}
