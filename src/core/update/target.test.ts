import { describe, expect, test } from 'bun:test';
import { targets } from '../../../scripts/targets.ts';
import { CliError } from '../../utils/errors.ts';
import {
	archiveName,
	binaryNameFor,
	detectTarget,
	isMusl,
	type PlatformProbe,
	type ReleaseTarget,
	releaseTargets,
} from './target.ts';

/** A machine described in one line. `present` lists the files that exist on it. */
function probe(platform: NodeJS.Platform, arch: string, present: string[] = []): PlatformProbe {
	return { platform, arch, exists: (path) => present.includes(path) };
}

describe('detectTarget', () => {
	test('macOS and Windows, both processors', () => {
		expect(detectTarget(probe('darwin', 'arm64'))).toBe('darwin-arm64');
		expect(detectTarget(probe('darwin', 'x64'))).toBe('darwin-x64');
		expect(detectTarget(probe('win32', 'x64'))).toBe('windows-x64');
		expect(detectTarget(probe('win32', 'arm64'))).toBe('windows-arm64');
	});

	test('an ordinary Linux gets the glibc build', () => {
		expect(detectTarget(probe('linux', 'x64'))).toBe('linux-x64');
		expect(detectTarget(probe('linux', 'arm64'))).toBe('linux-arm64');
	});

	test('a musl Linux gets the musl build, found by its loader', () => {
		expect(detectTarget(probe('linux', 'x64', ['/lib/ld-musl-x86_64.so.1']))).toBe(
			'linux-x64-musl',
		);
		expect(detectTarget(probe('linux', 'arm64', ['/lib/ld-musl-aarch64.so.1']))).toBe(
			'linux-arm64-musl',
		);
	});

	test('Alpine is recognised even without the loader file', () => {
		expect(detectTarget(probe('linux', 'x64', ['/etc/alpine-release']))).toBe('linux-x64-musl');
	});

	test('the loader for the other processor does not count', () => {
		expect(detectTarget(probe('linux', 'x64', ['/lib/ld-musl-aarch64.so.1']))).toBe('linux-x64');
	});

	test('macOS is never musl, whatever is lying around on disk', () => {
		expect(isMusl(probe('darwin', 'arm64', ['/etc/alpine-release']))).toBe(false);
	});

	test('a platform or processor with no build says so, and says what there is', () => {
		expect(() => detectTarget(probe('freebsd', 'x64'))).toThrow(CliError);
		expect(() => detectTarget(probe('linux', 'ia32'))).toThrow(CliError);
		expect(() => detectTarget(probe('linux', 'riscv64'))).toThrow(CliError);
	});
});

describe('archiveName and binaryNameFor', () => {
	test('Windows ships a zip, everything else a tarball', () => {
		expect(archiveName('windows-x64')).toBe('smartify-os-windows-x64.zip');
		expect(archiveName('windows-arm64')).toBe('smartify-os-windows-arm64.zip');
		expect(archiveName('linux-x64-musl')).toBe('smartify-os-linux-x64-musl.tar.gz');
		expect(archiveName('darwin-arm64')).toBe('smartify-os-darwin-arm64.tar.gz');
	});

	test('only Windows has the .exe on the end', () => {
		for (const target of releaseTargets) {
			const expected = target.startsWith('windows-') ? 'smartify-os.exe' : 'smartify-os';
			expect(binaryNameFor(target)).toBe(expected);
		}
	});
});

describe('the published targets', () => {
	// scripts/targets.ts decides what gets built, this file decides what gets downloaded.
	// They are separate on purpose, so this is what catches a ninth platform being added to
	// one of them and not the other.
	test('match the targets the build script compiles for', () => {
		const built = targets.map((target) => target.replace('bun-', '')).sort();
		expect([...releaseTargets].sort()).toEqual(built as ReleaseTarget[]);
	});
});
