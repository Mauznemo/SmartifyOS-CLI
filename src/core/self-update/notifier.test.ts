import { describe, expect, test } from 'bun:test';
import { type CliState, stateVersion } from '../state.ts';
import {
	checkForUpdate,
	checkIntervalMs,
	type NotifierDeps,
	shouldCheck,
	updateCheckDisabled,
} from './notifier.ts';

const now = 1_785_844_662_000;
const hour = 60 * 60 * 1000;

/** A notifier wired to nothing at all, plus a record of what it did. */
function fakeDeps(overrides: Partial<NotifierDeps> = {}) {
	const told: string[] = [];
	const written: CliState[] = [];
	let fetched = 0;

	const base: NotifierDeps = {
		currentVersion: '0.1.1',
		now: () => now,
		readState: async () => ({ version: stateVersion }),
		writeState: async (state) => {
			written.push(state);
		},
		fetchLatestVersion: async () => undefined,
		notify: (latest) => {
			told.push(latest);
		},
	};

	const merged = { ...base, ...overrides };
	// Counted here rather than in the default, so an override is counted too.
	const deps: NotifierDeps = {
		...merged,
		fetchLatestVersion: async () => {
			fetched++;
			return await merged.fetchLatestVersion();
		},
	};

	return { deps, told, written, fetchCount: () => fetched };
}

describe('shouldCheck', () => {
	test('a machine that has never checked is due', () => {
		expect(shouldCheck(undefined, now)).toBe(true);
		expect(shouldCheck({}, now)).toBe(true);
	});

	test('an hour ago is too soon, a day ago is not', () => {
		expect(shouldCheck({ lastCheckedAt: now - hour }, now)).toBe(false);
		expect(shouldCheck({ lastCheckedAt: now - 25 * hour }, now)).toBe(true);
	});

	test('exactly one interval later counts as due', () => {
		expect(shouldCheck({ lastCheckedAt: now - checkIntervalMs }, now)).toBe(true);
		expect(shouldCheck({ lastCheckedAt: now - checkIntervalMs + 1 }, now)).toBe(false);
	});

	test('a clock put backwards does not lock the check out forever', () => {
		expect(shouldCheck({ lastCheckedAt: now + 100 * hour }, now)).toBe(true);
	});

	test('a timestamp that is not a number is no timestamp at all', () => {
		expect(shouldCheck({ lastCheckedAt: Number.NaN }, now)).toBe(true);
		expect(shouldCheck({ lastCheckedAt: Number.POSITIVE_INFINITY }, now)).toBe(true);
	});
});

describe('updateCheckDisabled', () => {
	test('our own variable turns it off', () => {
		expect(updateCheckDisabled({ SMARTIFY_OS_NO_UPDATE_CHECK: '1' })).toBe(true);
		expect(updateCheckDisabled({ SMARTIFY_OS_NO_UPDATE_CHECK: 'yes' })).toBe(true);
	});

	test('the one everyone else uses turns it off too', () => {
		expect(updateCheckDisabled({ NO_UPDATE_NOTIFIER: '1' })).toBe(true);
	});

	test('unset, empty, 0 and false all mean leave it on', () => {
		expect(updateCheckDisabled({})).toBe(false);
		expect(updateCheckDisabled({ SMARTIFY_OS_NO_UPDATE_CHECK: '' })).toBe(false);
		expect(updateCheckDisabled({ SMARTIFY_OS_NO_UPDATE_CHECK: '0' })).toBe(false);
		expect(updateCheckDisabled({ SMARTIFY_OS_NO_UPDATE_CHECK: 'false' })).toBe(false);
	});
});

describe('checkForUpdate', () => {
	test('says what it already knew without asking GitHub again', async () => {
		const { deps, told, fetchCount } = fakeDeps({
			readState: async () => ({
				version: stateVersion,
				selfUpdate: { lastCheckedAt: now - hour, latestVersion: '0.2.0' },
			}),
		});

		await checkForUpdate(deps);

		expect(told).toEqual(['0.2.0']);
		expect(fetchCount()).toBe(0);
	});

	test('asks GitHub once the day is up', async () => {
		const { deps, told, fetchCount } = fakeDeps({
			readState: async () => ({
				version: stateVersion,
				selfUpdate: { lastCheckedAt: now - 25 * hour },
			}),
			fetchLatestVersion: async () => '0.3.0',
		});

		await checkForUpdate(deps);

		expect(fetchCount()).toBe(1);
		expect(told).toEqual(['0.3.0']);
	});

	test('does not say the same thing twice when the fresh answer confirms the old one', async () => {
		const { deps, told } = fakeDeps({
			readState: async () => ({
				version: stateVersion,
				selfUpdate: { lastCheckedAt: now - 25 * hour, latestVersion: '0.2.0' },
			}),
			fetchLatestVersion: async () => '0.2.0',
		});

		await checkForUpdate(deps);

		expect(told).toEqual(['0.2.0']);
	});

	test('writes the time down even when the check could not reach GitHub', async () => {
		const { deps, written, told } = fakeDeps({
			fetchLatestVersion: async () => undefined,
		});

		await checkForUpdate(deps);

		expect(written).toHaveLength(1);
		expect(written[0]?.selfUpdate?.lastCheckedAt).toBe(now);
		expect(written[0]?.selfUpdate?.latestVersion).toBeUndefined();
		expect(told).toEqual([]);
	});

	test('keeps the version it knew when a later check fails', async () => {
		const { deps, written } = fakeDeps({
			readState: async () => ({
				version: stateVersion,
				selfUpdate: { lastCheckedAt: now - 25 * hour, latestVersion: '0.2.0' },
			}),
			fetchLatestVersion: async () => undefined,
		});

		await checkForUpdate(deps);

		expect(written[0]?.selfUpdate?.latestVersion).toBe('0.2.0');
	});

	test('says nothing at all when there is nothing newer', async () => {
		const { deps, told } = fakeDeps({
			readState: async () => ({
				version: stateVersion,
				selfUpdate: { lastCheckedAt: now - hour, latestVersion: '0.1.1' },
			}),
		});

		await checkForUpdate(deps);

		expect(told).toEqual([]);
	});

	test('an older version on GitHub is not news', async () => {
		const { deps, told } = fakeDeps({ fetchLatestVersion: async () => '0.1.0' });

		await checkForUpdate(deps);

		expect(told).toEqual([]);
	});

	test('a state file it cannot write is not a reason to keep quiet', async () => {
		const { deps, told } = fakeDeps({
			writeState: async () => {
				throw new Error('read only filesystem');
			},
			fetchLatestVersion: async () => '0.4.0',
		});

		await checkForUpdate(deps);

		expect(told).toEqual(['0.4.0']);
	});
});
