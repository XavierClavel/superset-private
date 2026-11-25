import { Trans } from "@lingui/react/macro";
import type { ClaudeArtifact } from "@superset/agent-setup/claude-artifacts";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@superset/ui/empty";
import { LuFileText, LuSearchX } from "react-icons/lu";
import { ArtifactCard } from "./components/ArtifactCard";

interface ArtifactsGridProps {
	artifacts: ClaudeArtifact[];
	workspaceNames: Map<string, string>;
	hasSearch: boolean;
	onOpen: (url: string) => void;
}

export function ArtifactsGrid({
	artifacts,
	workspaceNames,
	hasSearch,
	onOpen,
}: ArtifactsGridProps) {
	if (artifacts.length === 0) {
		return (
			<Empty className="my-auto min-h-80 border-0 py-20 md:py-20">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						{hasSearch ? (
							<LuSearchX className="size-5" />
						) : (
							<LuFileText className="size-5" />
						)}
					</EmptyMedia>
					<EmptyTitle>
						{hasSearch ? (
							<Trans>No pages match</Trans>
						) : (
							<Trans>No Claude artifacts yet</Trans>
						)}
					</EmptyTitle>
					<EmptyDescription>
						{hasSearch ? (
							<Trans>Try a different search or filter.</Trans>
						) : (
							<Trans>
								The artifacts your agents publish from Paradev show up here.
							</Trans>
						)}
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{artifacts.map((artifact) => (
				<ArtifactCard
					key={artifact.url}
					artifact={artifact}
					workspaceName={
						artifact.workspaceId
							? workspaceNames.get(artifact.workspaceId)
							: undefined
					}
					onOpen={onOpen}
				/>
			))}
		</div>
	);
}
