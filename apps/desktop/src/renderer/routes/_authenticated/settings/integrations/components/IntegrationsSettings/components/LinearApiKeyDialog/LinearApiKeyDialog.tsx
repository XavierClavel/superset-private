import { Trans, useLingui } from "@lingui/react/macro";
import { errorMessage } from "@superset/i18n/errors";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Input } from "@superset/ui/input";
import { toast } from "@superset/ui/sonner";
import { useEffect, useState } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";

const LINEAR_API_KEYS_URL = "https://linear.app/settings/account/security";

interface LinearApiKeyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isConnected: boolean;
}

export function LinearApiKeyDialog({
	open,
	onOpenChange,
	isConnected,
}: LinearApiKeyDialogProps) {
	const { t } = useLingui();
	const utils = electronTrpc.useUtils();
	const [apiKey, setApiKey] = useState("");

	useEffect(() => {
		if (!open) setApiKey("");
	}, [open]);

	const onChanged = (message: string) => {
		void utils.linear.invalidate();
		onOpenChange(false);
		toast.success(message);
	};

	const saveMutation = electronTrpc.linear.setApiKey.useMutation({
		onSuccess: () => onChanged(t({ message: "Linear API key saved" })),
		onError: (error) =>
			toast.error(
				errorMessage(error, t({ message: "Failed to save the API key" })),
			),
	});
	const removeMutation = electronTrpc.linear.clearApiKey.useMutation({
		onSuccess: () => onChanged(t({ message: "Linear API key removed" })),
		onError: (error) =>
			toast.error(
				errorMessage(error, t({ message: "Failed to remove the API key" })),
			),
	});
	const isPending = saveMutation.isPending || removeMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Linear API key</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Paste a Linear personal API key to use Linear in Tasks. The key
							stays on this computer.
						</Trans>
					</DialogDescription>
				</DialogHeader>
				<form
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (apiKey.trim()) saveMutation.mutate({ apiKey });
					}}
				>
					<Input
						type="password"
						autoFocus
						value={apiKey}
						onChange={(event) => setApiKey(event.target.value)}
						placeholder={
							isConnected
								? t({ message: "Paste a new key to replace the saved one" })
								: "lin_api_…"
						}
						aria-label={t({ message: "Linear API key" })}
					/>
					<Button
						type="button"
						variant="link"
						className="h-auto p-0 text-xs"
						onClick={() =>
							window.open(LINEAR_API_KEYS_URL, "_blank", "noopener,noreferrer")
						}
					>
						<Trans>Create a key in Linear</Trans>
					</Button>
					<DialogFooter>
						{isConnected && (
							<Button
								type="button"
								variant="ghost"
								className="mr-auto text-destructive"
								disabled={isPending}
								onClick={() => removeMutation.mutate()}
							>
								<Trans>Remove key</Trans>
							</Button>
						)}
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={!apiKey.trim() || isPending}>
							<Trans>Save</Trans>
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
