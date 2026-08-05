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
	if (candidates.includes(input)) return input;

	// Somebody who types a word that is part of a longer command name has not made a typo,
	// they have guessed a shorter name. `update` for `self-update` is the case this exists
	// for, and edit distance is no use there: five characters apart reads as a different
	// word entirely. The shortest match wins, being the least of a leap.
	if (input.length >= 3) {
		const contains = candidates
			.filter((candidate) => candidate.includes(input))
			.sort((a, b) => a.length - b.length);
		if (contains[0]) return contains[0];
	}

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
