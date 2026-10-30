export function toPastelColor(color: string): string {
	return `color-mix(in srgb, ${color} 40%, white)`;
}
