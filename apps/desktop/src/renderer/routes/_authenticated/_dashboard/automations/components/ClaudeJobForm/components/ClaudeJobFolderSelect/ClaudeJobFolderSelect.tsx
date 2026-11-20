import { Trans } from "@lingui/react/macro";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@superset/ui/select";
import { useHostProjects } from "renderer/hooks/host-projects/useHostProjects";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

const CLAUDE_JOBS_FOLDER = "claude-jobs-folder";

interface ClaudeJobFolderSelectProps {
	/** Null for Claude Jobs' own folder. */
	value: string | null;
	onChange: (cwd: string | null) => void;
	disabled?: boolean;
}

/** Where a job runs: the folder of a project on this Mac, or Claude Jobs' own. */
export function ClaudeJobFolderSelect({
	value,
	onChange,
	disabled,
}: ClaudeJobFolderSelectProps) {
	const { machineId } = useLocalHostService();
	const { projects } = useHostProjects();
	const folders = projects.flatMap((project) =>
		machineId && project.repoPath && project.hostIds.includes(machineId)
			? [{ name: project.name, path: project.repoPath }]
			: [],
	);
	const otherFolder =
		value !== null && !folders.some((folder) => folder.path === value);

	return (
		<Select
			value={value ?? CLAUDE_JOBS_FOLDER}
			onValueChange={(next) =>
				onChange(next === CLAUDE_JOBS_FOLDER ? null : next)
			}
			disabled={disabled}
		>
			<SelectTrigger className="w-80">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={CLAUDE_JOBS_FOLDER}>
					<Trans>Claude Jobs folder</Trans>
				</SelectItem>
				{folders.map((folder) => (
					<SelectItem key={folder.path} value={folder.path} title={folder.path}>
						{folder.name}
					</SelectItem>
				))}
				{otherFolder && (
					<SelectItem value={value} className="font-mono text-xs">
						{value}
					</SelectItem>
				)}
			</SelectContent>
		</Select>
	);
}
