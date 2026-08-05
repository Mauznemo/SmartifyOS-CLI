import { describe, expect, test } from 'bun:test';
import { closest } from './suggest.ts';

describe('closest', () => {
	const commandNames = ['new', 'build', 'run', 'deploy', 'doctor'];

	test('catches a one letter typo', () => {
		expect(closest('buld', commandNames)).toBe('build');
		expect(closest('deplyo', commandNames)).toBe('deploy');
	});

	test('gives nothing back when the word is not close to anything', () => {
		expect(closest('somethingelseentirely', commandNames)).toBeUndefined();
	});

	test('gives nothing back when there is nothing to suggest', () => {
		expect(closest('build', [])).toBeUndefined();
	});

	test('an exact match suggests itself', () => {
		expect(closest('build', commandNames)).toBe('build');
	});

	test('a word that is part of a longer name points at that name', () => {
		// Too many edits apart to be a typo, but it is exactly what someone types when they
		// want to update the CLI and have not learned the name yet.
		expect(closest('update', ['self-update', 'help'])).toBe('self-update');
		expect(closest('upgrade', ['self-upgrade', 'help'])).toBe('self-upgrade');
	});

	test('the shortest of several containing names wins, being the least of a leap', () => {
		expect(closest('build', ['build-and-deploy', 'prebuild', 'rebuild'])).toBe('rebuild');
	});

	test('an exact match beats a longer name that contains it', () => {
		expect(closest('update', ['self-update', 'update'])).toBe('update');
	});

	test('a fragment too short to mean anything is not treated as a guess', () => {
		expect(closest('up', ['self-update', 'help'])).toBeUndefined();
	});
});
