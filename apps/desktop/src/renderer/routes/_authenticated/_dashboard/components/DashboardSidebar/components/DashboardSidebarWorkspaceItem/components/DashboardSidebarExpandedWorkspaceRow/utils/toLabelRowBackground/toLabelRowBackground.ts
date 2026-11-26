const STRIPE_ANGLE = "115deg";

export function toLabelRowBackground(colors: string[]): string | undefined {
	if (colors.length === 0) return undefined;
	const tints = colors.map(
		(color) => `color-mix(in srgb, ${color} var(--label-tint), white)`,
	);
	if (tints.length === 1) return `linear-gradient(${tints[0]}, ${tints[0]})`;
	const step = 100 / tints.length;
	const stops = tints.map((tint, index) => {
		const start = Number((index * step).toFixed(3));
		const end = Number(((index + 1) * step).toFixed(3));
		return `${tint} ${start}% ${end}%`;
	});
	return `linear-gradient(${STRIPE_ANGLE}, ${stops.join(", ")})`;
}
