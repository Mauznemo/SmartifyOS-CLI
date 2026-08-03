import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { Glob } from 'bun';

/**
 * Guards the writing style rule from CLAUDE.md: no em dashes and no en dashes, anywhere.
 *
 * The rule is easy to break by accident, and no linter checks prose, so it is checked here
 * instead. The characters are built from their code points so that this file does not trip
 * its own test.
 */

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

const repoRoot = join(import.meta.dir, '..');

const patterns = ['**/*.ts', '**/*.md', '**/*.json', '**/*.sh', '**/*.ps1', '**/*.yml'];
const ignored = ['node_modules/', 'dist/', '.git/', 'bun.lock'];

/**
 * The only two files allowed to contain the characters, because both have to name them to
 * do their job. Nothing else belongs on this list.
 */
const exempt = ['CLAUDE.md', 'tests/dashes.test.ts'];

async function trackedFiles(): Promise<string[]> {
	const found = new Set<string>();
	for (const pattern of patterns) {
		for await (const file of new Glob(pattern).scan({ cwd: repoRoot, dot: true })) {
			if (ignored.some((skip) => file.startsWith(skip) || file.includes(`/${skip}`))) continue;
			found.add(file);
		}
	}
	return [...found].sort();
}

describe('writing style', () => {
	test('no em dashes or en dashes anywhere in the repo', async () => {
		const files = await trackedFiles();
		expect(files.length).toBeGreaterThan(5);

		const offenders: string[] = [];

		for (const file of files) {
			if (exempt.includes(file)) continue;

			const contents = await Bun.file(join(repoRoot, file)).text();
			contents.split('\n').forEach((line, index) => {
				if (line.includes(EM_DASH) || line.includes(EN_DASH)) {
					offenders.push(`${file}:${index + 1}: ${line.trim()}`);
				}
			});
		}

		expect(offenders).toEqual([]);
	});
});
