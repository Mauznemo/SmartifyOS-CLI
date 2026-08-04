import { existsSync } from 'node:fs';
import { CliError } from '../../utils/errors.ts';

/**
 * Which of the published builds belongs on this machine.
 *
 * The answer is baked in at build time, because guessing it gets one case badly wrong: a
 * glibc binary does not start at all on Alpine, and there is no way to tell glibc from musl
 * that is as reliable as the build knowing what it compiled. Detection is only the fallback
 * for a run from source.
 */

/** The eight names the release workflow publishes an archive for. */
export const releaseTargets = [
	'darwin-arm64',
	'darwin-x64',
	'linux-x64',
	'linux-arm64',
	'linux-x64-musl',
	'linux-arm64-musl',
	'windows-x64',
	'windows-arm64',
] as const;

export type ReleaseTarget = (typeof releaseTargets)[number];

/** What this binary was compiled for, or `dev` when it is running from source. */
export const buildTarget: string = typeof __BUILD_TARGET__ === 'string' ? __BUILD_TARGET__ : 'dev';

/** The bits of the machine target detection looks at, so a test can describe any machine. */
export interface PlatformProbe {
	platform: NodeJS.Platform;
	arch: string;
	exists(path: string): boolean;
}

export function hostProbe(): PlatformProbe {
	return { platform: process.platform, arch: process.arch, exists: existsSync };
}

/**
 * Whether this Linux runs on musl rather than glibc.
 *
 * The dynamic loader is named after the machine, not after the names Bun uses, so x64 is
 * x86_64 and arm64 is aarch64. Bun does not fill in the glibc version that Node reports in
 * `process.report`, so the loader file itself is the thing to look for.
 */
export function isMusl(probe: PlatformProbe): boolean {
	if (probe.platform !== 'linux') return false;

	const machine = probe.arch === 'arm64' ? 'aarch64' : 'x86_64';
	return probe.exists(`/lib/ld-musl-${machine}.so.1`) || probe.exists('/etc/alpine-release');
}

/**
 * Works out the target from the running machine.
 *
 * @throws {CliError} on a platform or processor there is no build for.
 */
export function detectTarget(probe: PlatformProbe = hostProbe()): ReleaseTarget {
	const os =
		probe.platform === 'darwin'
			? 'darwin'
			: probe.platform === 'win32'
				? 'windows'
				: probe.platform === 'linux'
					? 'linux'
					: undefined;

	if (!os) {
		throw new CliError(`SmartifyOS does not have a build for ${probe.platform}.`, {
			hint: 'It runs on macOS, Linux and Windows.',
		});
	}

	if (probe.arch !== 'x64' && probe.arch !== 'arm64') {
		throw new CliError(`SmartifyOS does not have a build for ${probe.arch}.`, {
			hint: 'It runs on 64 bit Intel and ARM.',
		});
	}

	const libc = os === 'linux' && isMusl(probe) ? '-musl' : '';
	return `${os}-${probe.arch}${libc}` as ReleaseTarget;
}

/** The target to download for. What the build says, or failing that what the machine says. */
export function currentTarget(probe: PlatformProbe = hostProbe()): ReleaseTarget {
	if ((releaseTargets as readonly string[]).includes(buildTarget)) {
		return buildTarget as ReleaseTarget;
	}
	return detectTarget(probe);
}

/** The release asset for a target, for example `smartify-os-linux-x64-musl.tar.gz`. */
export function archiveName(target: ReleaseTarget): string {
	// Windows gets a zip, everything else a tarball. This has to match release.yml.
	const extension = target.startsWith('windows-') ? 'zip' : 'tar.gz';
	return `smartify-os-${target}.${extension}`;
}

/** The single file inside that archive. */
export function binaryNameFor(target: ReleaseTarget): string {
	return target.startsWith('windows-') ? 'smartify-os.exe' : 'smartify-os';
}
