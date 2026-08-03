import { join } from 'node:path';

/** Where the build scripts agree things live. */
export const repoRoot = join(import.meta.dir, '..');
export const entry = join(repoRoot, 'src', 'index.ts');
export const outDir = join(repoRoot, 'dist');

/** Every platform a release is published for. */
export const targets = [
	'bun-darwin-arm64',
	'bun-darwin-x64',
	'bun-linux-x64',
	'bun-linux-arm64',
	'bun-linux-x64-musl',
	'bun-linux-arm64-musl',
	'bun-windows-x64',
	'bun-windows-arm64',
] as const;

export type Target = (typeof targets)[number];

/** The target matching the machine this script is running on. */
export function hostTarget(): Target {
	const os =
		process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
	const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
	return `bun-${os}-${arch}` as Target;
}

/** The file name a target produces, for example `smartify-os-linux-arm64`. */
export function outputName(target: Target): string {
	const suffix = target.replace('bun-', '');
	return target.startsWith('bun-windows') ? `smartify-os-${suffix}.exe` : `smartify-os-${suffix}`;
}

/** What the binary is called once it is installed, with no platform in the name. */
export const installedName = process.platform === 'win32' ? 'smartify-os.exe' : 'smartify-os';
