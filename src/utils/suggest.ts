/**
 * Internal: edit distance between two strings, used only to suggest a command after a typo.
 */
function distance(a: string, b: string): number {
	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			current[j] = Math.min(
				(current[j - 1] ?? 0) + 1,
				(previous[j] ?? 0) + 1,
				(previous[j - 1] ?? 0) + cost,
			);
		}
		previous = current;
	}

	return previous[b.length] ?? Number.POSITIVE_INFINITY;
}

/**
 * Picks the candidate closest to `input`, so a mistyped command can be answered with
 * "did you mean". Returns undefined when nothing is close enough to be worth guessing.
 */
export function closest(input: string, candidates: string[]): string | undefined {
	let best: string | undefined;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of candidates) {
		const d = distance(input, candidate);
		if (d < bestDistance) {
			bestDistance = d;
			best = candidate;
		}
	}

	// More than a third of the word being wrong is a different word, not a typo.
	const limit = Math.max(2, Math.floor(input.length / 3));
	return bestDistance <= limit ? best : undefined;
}
