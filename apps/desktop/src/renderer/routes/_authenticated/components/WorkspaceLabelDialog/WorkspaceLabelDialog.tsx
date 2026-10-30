import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Input } from "@superset/ui/input";
import { useEffect, useState } from "react";
import { ColorSelector } from "renderer/components/ColorSelector";
import { toPastelColor } from "renderer/routes/_authenticated/components/WorkspaceLabelPill";
import { PROJECT_COLORS } from "shared/constants/project-colors";
import { isLabelNameConflict } from "./isLabelNameConflict";

export interface WorkspaceLabelValues {
	name: string;
	color: string;
}

interface WorkspaceLabelDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "rename";
	initial?: WorkspaceLabelValues;
	onSubmit: (values: WorkspaceLabelValues) => Promise<void>;
}

const DEFAULT_COLOR = PROJECT_COLORS[0].value;

export function WorkspaceLabelDialog({
	open,
	onOpenChange,
	mode,
	initial,
	onSubmit,
}: WorkspaceLabelDialogProps) {
	const { t } = useLingui();
	const [name, setName] = useState(initial?.name ?? "");
	const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setName(initial?.name ?? "");
		setColor(initial?.color ?? DEFAULT_COLOR);
		setErrorMessage(null);
	}, [open, initial?.name, initial?.color]);

	const trimmedName = name.trim();

	const handleSubmit = async () => {
		if (!trimmedName || isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage(null);
		try {
			await onSubmit({ name: trimmedName, color });
			onOpenChange(false);
		} catch (error) {
			setErrorMessage(
				isLabelNameConflict(error)
					? t({ message: "A label with this name already exists" })
					: t({ message: "Could not save the label" }),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[340px] gap-3">
				<DialogHeader>
					<DialogTitle className="font-medium">
						{mode === "create" ? (
							<Trans>New label</Trans>
						) : (
							<Trans>Rename label</Trans>
						)}
					</DialogTitle>
				</DialogHeader>
				<form
					className="flex flex-col gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						void handleSubmit();
					}}
				>
					<Input
						autoFocus
						value={name}
						maxLength={40}
						placeholder={t({ message: "Label name" })}
						aria-label={t({ message: "Label name" })}
						onChange={(event) => {
							setName(event.target.value);
							setErrorMessage(null);
						}}
					/>
					<ColorSelector
						selectedColor={color}
						onSelectColor={setColor}
						toSwatchColor={toPastelColor}
					/>
					{errorMessage && (
						<p className="text-xs text-destructive">{errorMessage}</p>
					)}
					<DialogFooter className="flex-row justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={!trimmedName || isSubmitting}
						>
							{mode === "create" ? <Trans>Create</Trans> : <Trans>Save</Trans>}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
