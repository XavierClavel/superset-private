import { afterEach, beforeEach, expect, test } from "bun:test";

const { act, cleanup, renderHook } = await import("@testing-library/react");
const { useBaseBranchReset } = await import("./useBaseBranchReset");
const { useNewWorkspaceDraftStore } = await import(
	"renderer/stores/new-workspace-draft"
);
const { useWorkspaceCreateDefaultsStore } = await import(
	"renderer/stores/workspace-create-defaults"
);

afterEach(cleanup);

beforeEach(() => {
	useNewWorkspaceDraftStore.getState().resetDraft();
	useWorkspaceCreateDefaultsStore.setState({ baseBranchesByProjectId: {} });
});

function renderBaseBranch(initialHostId = "mac") {
	return renderHook(
		({ hostId }: { hostId: string | null }) => {
			const draft = useNewWorkspaceDraftStore();
			useBaseBranchReset({
				branchDefaultKey: draft.selectedProjectId,
				hostId,
				updateDraft: draft.updateDraft,
			});
			return {
				baseBranch: draft.baseBranch,
				baseBranchSource: draft.baseBranchSource,
			};
		},
		{ initialProps: { hostId: initialHostId as string | null } },
	);
}

/** What a sidebar "+" does: select the project, then mount the screen. */
function leaveBaseThenSelect(projectId: string) {
	const draft = useNewWorkspaceDraftStore.getState();
	draft.updateDraft({ baseBranch: "develop", baseBranchSource: "local" });
	draft.selectProject(projectId);
}

test("drops a base left over from another project when it mounts", () => {
	leaveBaseThenSelect("superset");

	const { result } = renderBaseBranch();

	expect(result.current).toEqual({ baseBranch: null, baseBranchSource: null });
});

test("applies the project's saved base when it mounts", () => {
	useWorkspaceCreateDefaultsStore
		.getState()
		.setBaseBranchDefault("cooknco", "release", "remote-tracking");
	leaveBaseThenSelect("cooknco");

	const { result } = renderBaseBranch();

	expect(result.current).toEqual({
		baseBranch: "release",
		baseBranchSource: "remote-tracking",
	});
});

test("keeps the draft's base while open, and resets it on a project change", () => {
	useNewWorkspaceDraftStore.getState().selectProject("padel-manager");
	const { result } = renderBaseBranch();

	act(() => {
		useNewWorkspaceDraftStore
			.getState()
			.updateDraft({ baseBranch: "hotfix", baseBranchSource: "local" });
		useWorkspaceCreateDefaultsStore
			.getState()
			.setBaseBranchDefault("padel-manager", "staging", "local");
	});
	expect(result.current.baseBranch).toBe("hotfix");

	act(() => {
		useNewWorkspaceDraftStore.getState().selectProject("superset");
	});
	expect(result.current).toEqual({ baseBranch: null, baseBranchSource: null });
});

test("re-seeds the project's saved base when the host changes", () => {
	useWorkspaceCreateDefaultsStore
		.getState()
		.setBaseBranchDefault("cooknco", "release", "remote-tracking");
	useNewWorkspaceDraftStore.getState().selectProject("cooknco");
	const { result, rerender } = renderBaseBranch("mac");

	act(() => {
		useNewWorkspaceDraftStore
			.getState()
			.updateDraft({ baseBranch: "hotfix", baseBranchSource: "local" });
	});
	expect(result.current.baseBranch).toBe("hotfix");

	rerender({ hostId: "other-host" });
	expect(result.current).toEqual({
		baseBranch: "release",
		baseBranchSource: "remote-tracking",
	});
});
