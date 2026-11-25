import { useLingui } from "@lingui/react/macro";
import type { ClaudeArtifact } from "@superset/agent-setup/claude-artifacts";
import { useFormat } from "@superset/i18n/react";
import { ExternalLink, FileText } from "lucide-react";
import { useNow } from "renderer/hooks/useNow";
import { THUMBNAIL_ASPECT_RATIO } from "renderer/routes/_authenticated/_dashboard/components/PageThumbnail";

interface ArtifactCardProps {
	artifact: ClaudeArtifact;
	workspaceName: string | undefined;
	onOpen: (url: string) => void;
}

export function ArtifactCard({
	artifact,
	workspaceName,
	onOpen,
}: ArtifactCardProps) {
	const { t } = useLingui();
	const now = useNow(60_000);
	const { formatRelativeTime } = useFormat();
	const title = artifact.title ?? t({ message: "Untitled" });

	return (
		<div className="group relative flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-muted-foreground/30">
			<div
				aria-hidden="true"
				className="overflow-hidden rounded-t-[7px] bg-muted/40 p-4"
				style={{ aspectRatio: THUMBNAIL_ASPECT_RATIO }}
			>
				{artifact.description ? (
					<p className="line-clamp-5 text-muted-foreground text-xs leading-relaxed">
						{artifact.description}
					</p>
				) : (
					<div className="flex h-full items-center justify-center text-muted-foreground">
						<FileText className="size-5 opacity-40" />
					</div>
				)}
			</div>

			<div className="flex flex-col gap-1 border-border/60 border-t px-3 py-2.5">
				<button
					type="button"
					onClick={() => onOpen(artifact.url)}
					className="flex min-w-0 items-center gap-1.5 text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
				>
					<span className="truncate font-medium text-sm">{title}</span>
					<ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</button>
				<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<span className="shrink-0">
						{formatRelativeTime(artifact.publishedAt, now)}
					</span>
					{workspaceName ? (
						<>
							<span aria-hidden="true">·</span>
							<span className="truncate">{workspaceName}</span>
						</>
					) : null}
				</span>
			</div>
		</div>
	);
}
