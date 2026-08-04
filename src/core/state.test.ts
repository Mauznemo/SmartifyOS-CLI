import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseState, readState, serializeState, stateVersion, writeState } from './state.ts';

const scratch = await mkdtemp(join(tmpdir(), 'smartify-os-state-'));

afterAll(async () => {
	await rm(scratch, { recursive: true, force: true });
});

describe('parseState', () => {
	test('reads a file it wrote itself', () => {
		const text = serializeState({
			version: stateVersion,
			update: { lastCheckedAt: 1785844662000, latestVersion: '0.2.0' },
		});
		expect(parseState(text)).toEqual({
			version: stateVersion,
			update: { lastCheckedAt: 1785844662000, latestVersion: '0.2.0' },
		});
	});

	test('anything unreadable becomes an empty state instead of an error', () => {
		for (const text of ['', 'not json', '[]', 'null', '42', '"a string"', '{']) {
			expect(parseState(text)).toEqual({ version: stateVersion });
		}
	});

	test('a state written by a different version of the CLI is thrown away', () => {
		expect(parseState('{"version": 99, "update": {"latestVersion": "9.9.9"}}')).toEqual({
			version: stateVersion,
		});
	});

	test('a field of the wrong type is dropped, never coerced', () => {
		const text = `{"version": ${stateVersion}, "update": {"lastCheckedAt": "yesterday", "latestVersion": 2}}`;
		expect(parseState(text)).toEqual({ version: stateVersion, update: {} });
	});

	test('an infinite timestamp does not survive a round trip through JSON either', () => {
		const text = `{"version": ${stateVersion}, "update": {"lastCheckedAt": null}}`;
		expect(parseState(text).update).toEqual({});
	});
});

describe('readState and writeState', () => {
	test('a file that is not there is an empty state', async () => {
		expect(await readState(join(scratch, 'nothing-here.json'))).toEqual({
			version: stateVersion,
		});
	});

	test('what goes in comes back out', async () => {
		const path = join(scratch, 'round-trip.json');
		await writeState(
			{ version: stateVersion, update: { lastCheckedAt: 5, latestVersion: '1.0.0' } },
			path,
		);
		expect(await readState(path)).toEqual({
			version: stateVersion,
			update: { lastCheckedAt: 5, latestVersion: '1.0.0' },
		});
	});

	test('it creates the folder rather than expecting one', async () => {
		const path = join(scratch, 'not', 'made', 'yet', 'state.json');
		await writeState({ version: stateVersion, update: { latestVersion: '2.0.0' } }, path);
		expect((await readState(path)).update?.latestVersion).toBe('2.0.0');
	});

	test('a write it cannot do is not an error', async () => {
		// A path with an existing file as one of its parent folders can never be created.
		const blocker = join(scratch, 'blocker.json');
		await writeState({ version: stateVersion }, blocker);
		await writeState({ version: stateVersion }, join(blocker, 'state.json'));
	});
});
