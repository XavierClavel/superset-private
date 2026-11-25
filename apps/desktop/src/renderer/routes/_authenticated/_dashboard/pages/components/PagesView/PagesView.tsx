import type { ClaudeArtifact } from "@superset/agent-setup/claude-artifacts";
import { authClient } from "renderer/lib/auth-client";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { PageHeader } from "renderer/routes/_authenticated/_dashboard/components/PageHeader";
import { usePageFavorites } from "renderer/routes/_authenticated/_dashboard/hooks/usePageFavorites";
import { usePageWorkspaceNames } from "../../hooks/usePageWorkspaceNames";
import { PagesList, type PagesListProps } from "./components/PagesList";
import { useCreatePageWithAgent } from "./hooks/useCreatePageWithAgent";

const NO_ARTIFACTS: ClaudeArtifact[] = [];

type PagesViewProps = Pick<
	PagesListProps,
	| "search"
	| "scope"
	| "authorId"
	| "workspaceId"
	| "onSearchChange"
	| "onScopeChange"
	| "onAuthorChange"
	| "onWorkspaceChange"
	| "onOpenPage"
>;

export function PagesView(props: PagesViewProps) {
	const { creatingWithAgent, handleCreateWithAgent } = useCreatePageWithAgent();
	const { data: session } = authClient.useSession();
	const { favoritePageIds, favoritePageIdSet, toggleFavorite } =
		usePageFavorites();
	const workspaceNames = usePageWorkspaceNames();
	const { data: artifacts = NO_ARTIFACTS } =
		electronTrpc.claudeArtifacts.list.useQuery();
	const openUrl = electronTrpc.external.openUrl.useMutation();

	return (
		<div className="flex h-full w-full flex-1 flex-col overflow-hidden">
			<PageHeader />

			<PagesList
				{...props}
				artifacts={artifacts}
				onOpenArtifact={(url) => openUrl.mutate(url)}
				currentUserId={session?.user.id}
				favoritePageIds={favoritePageIds}
				favoritePageIdSet={favoritePageIdSet}
				onTogglePin={toggleFavorite}
				workspaceNames={workspaceNames}
				creatingWithAgent={creatingWithAgent}
				onCreateWithAgent={handleCreateWithAgent}
			/>
		</div>
	);
}
