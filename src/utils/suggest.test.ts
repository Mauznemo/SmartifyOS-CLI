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
});
