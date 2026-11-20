import { Trans, useLingui } from "@lingui/react/macro";
import { formatDate } from "@superset/i18n/format";
import { Input } from "@superset/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@superset/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@superset/ui/toggle-group";
import { useState } from "react";
import type {
	ClaudeJobDraft,
	ClaudeJobRepeat,
} from "../../../../utils/claudeJobDraft";

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

// 1 January 2024 is a Monday, so day n of that month is ISO weekday n.
const weekdayLabel = (day: number) =>
	formatDate(new Date(2024, 0, day), { weekday: "short" });

const pad = (value: number) => String(value).padStart(2, "0");

function parseMonthDays(text: string): number[] {
	const days = text
		.split(/[\s,]+/)
		.map(Number)
		.filter((day) => Number.isInteger(day) && day >= 1 && day <= 31);
	return [...new Set(days)].sort((a, b) => a - b);
}

interface ClaudeJobScheduleFieldsProps {
	value: ClaudeJobDraft;
	onChange: (patch: Partial<ClaudeJobDraft>) => void;
	disabled?: boolean;
}

export function ClaudeJobScheduleFields({
	value,
	onChange,
	disabled,
}: ClaudeJobScheduleFieldsProps) {
	const { t } = useLingui();
	const [monthDaysText, setMonthDaysText] = useState(() =>
		value.monthDays.join(", "),
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<Select
					value={value.repeat}
					onValueChange={(repeat) =>
						onChange({ repeat: repeat as ClaudeJobRepeat })
					}
					disabled={disabled}
				>
					<SelectTrigger className="w-52">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="daily">
							<Trans>Every day</Trans>
						</SelectItem>
						<SelectItem value="weekdays">
							<Trans>Days of the week</Trans>
						</SelectItem>
						<SelectItem value="monthDays">
							<Trans>Days of the month</Trans>
						</SelectItem>
						<SelectItem value="cron">
							<Trans>Cron expression</Trans>
						</SelectItem>
					</SelectContent>
				</Select>
				{value.repeat !== "cron" && (
					<Input
						type="time"
						aria-label={t({ message: "Time" })}
						value={`${pad(value.hour)}:${pad(value.minute)}`}
						onChange={(event) => {
							const [hour, minute] = event.target.value.split(":").map(Number);
							if (Number.isInteger(hour) && Number.isInteger(minute)) {
								onChange({ hour, minute });
							}
						}}
						className="w-32"
						disabled={disabled}
					/>
				)}
			</div>

			{value.repeat === "weekdays" && (
				<ToggleGroup
					type="multiple"
					variant="outline"
					value={value.weekdays.map(String)}
					onValueChange={(days) =>
						onChange({
							weekdays: days.map(Number).sort((a, b) => a - b),
						})
					}
					disabled={disabled}
				>
					{ISO_WEEKDAYS.map((day) => (
						<ToggleGroupItem key={day} value={String(day)} className="px-3">
							{weekdayLabel(day)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)}

			{value.repeat === "monthDays" && (
				<Input
					aria-label={t({ message: "Days of the month" })}
					value={monthDaysText}
					onChange={(event) => {
						setMonthDaysText(event.target.value);
						onChange({ monthDays: parseMonthDays(event.target.value) });
					}}
					placeholder="1, 15"
					className="w-52"
					disabled={disabled}
				/>
			)}

			{value.repeat === "cron" && (
				<Input
					aria-label={t({ message: "Cron expression" })}
					value={value.cron}
					onChange={(event) => onChange({ cron: event.target.value })}
					placeholder="0 9 * * 1-5"
					className="w-52 font-mono"
					disabled={disabled}
				/>
			)}
		</div>
	);
}
