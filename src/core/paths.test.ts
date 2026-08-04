import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { type PathEnv, stateDir, statePath } from './paths.ts';

function env(overrides: Partial<PathEnv> = {}): PathEnv {
	return {
		platform: 'linux',
		home: '/home/mia',
		localAppData: undefined,
		override: undefined,
		...overrides,
	};
}

describe('stateDir', () => {
	test('sits next to the bin folder the installer creates on macOS and Linux', () => {
		expect(stateDir(env({ platform: 'linux' }))).toBe(join('/home/mia', '.smartify-os'));
		expect(stateDir(env({ platform: 'darwin', home: '/Users/mia' }))).toBe(
			join('/Users/mia', '.smartify-os'),
		);
	});

	test('follows LOCALAPPDATA on Windows, the same as install.ps1', () => {
		const dir = stateDir(
			env({
				platform: 'win32',
				home: 'C:\\Users\\mia',
				localAppData: 'C:\\Users\\mia\\AppData\\Local',
			}),
		);
		expect(dir).toBe(join('C:\\Users\\mia\\AppData\\Local', 'SmartifyOS'));
	});

	test('works out the Windows path itself when LOCALAPPDATA is not set', () => {
		const dir = stateDir(env({ platform: 'win32', home: 'C:\\Users\\mia' }));
		expect(dir).toBe(join('C:\\Users\\mia', 'AppData', 'Local', 'SmartifyOS'));
	});

	test('SMARTIFY_OS_STATE_DIR wins on every platform', () => {
		for (const platform of ['linux', 'darwin', 'win32'] as const) {
			expect(stateDir(env({ platform, override: '/tmp/somewhere' }))).toBe('/tmp/somewhere');
		}
	});
});

describe('statePath', () => {
	test('is one file inside the folder', () => {
		expect(statePath(env({ override: '/tmp/somewhere' }))).toBe(
			join('/tmp/somewhere', 'state.json'),
		);
	});
});
