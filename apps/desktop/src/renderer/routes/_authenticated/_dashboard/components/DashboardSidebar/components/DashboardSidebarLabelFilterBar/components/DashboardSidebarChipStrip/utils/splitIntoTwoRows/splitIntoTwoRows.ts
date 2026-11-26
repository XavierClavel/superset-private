export function splitIntoTwoRows(widths: number[], gap: number): number {
	const total = widths.reduce((sum, width) => sum + width, 0);
	let best = 1;
	let bestWidest = Number.POSITIVE_INFINITY;
	let firstRow = 0;
	for (let index = 1; index < widths.length; index++) {
		firstRow += widths[index - 1] ?? 0;
		const firstRowWidth = firstRow + gap * (index - 1);
		const secondRowWidth = total - firstRow + gap * (widths.length - index - 1);
		const widest = Math.max(firstRowWidth, secondRowWidth);
		if (widest < bestWidest) {
			bestWidest = widest;
			best = index;
		}
	}
	return best;
}
