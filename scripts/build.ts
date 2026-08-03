#!/usr/bin/env bun
import { mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { $ } from 'bun';
import color from 'picocolors';

/**
 * Compiles the CLI into a standalone binary, one that runs on a machine with no Bun and no
 * Node installed. Used both from `bun run build` and from the release workflow, so that
 * what CI ships is what you can reproduce locally.
 *
 *   bun run build            just this machine, then runs it to check it works
 *   bun run build:all        every platform we publish for
 *   bun run build --target bun-linux-arm64
 */

/** Every platform a release is published for. */
const targets = [
	'bun-darwin-arm64',
	'bun-darwin-x64',
	'bun-linux-x64',
	'bun-linux-arm64',
	'bun-linux-x64-musl',
	'bun-linux-arm64-musl',
	'bun-windows-x64',
	'bun-windows-arm64',
] as const;

type Target = (typeof targets)[number];

const repoRoot = join(import.meta.dir, '..');
const entry = join(repoRoot, 'src', 'index.ts');
const outDir = join(repoRoot, 'dist');

/** The target matching the machine this script is running on. */
function hostTarget(): Target {
	const os =
		process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
	const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
	return `bun-${os}-${arch}` as Target;
}

/** The file name a target produces, for example `smartify-os-linux-arm64`. */
function outputName(target: Target): string {
	const suffix = target.replace('bun-', '');
	return target.startsWith('bun-windows') ? `smartify-os-${suffix}.exe` : `smartify-os-${suffix}`;
}

/** Short commit the binary is built from, so `--version` can point at exact source. */
async function buildSha(): Promise<string> {
	try {
		return (await $`git rev-parse --short HEAD`.cwd(repoRoot).quiet()).text().trim() || 'dev';
	} catch {
		return 'dev';
	}
}

async function humanSize(path: string): Promise<string> {
	const { size } = await stat(path);
	return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function buildTarget(target: Target, sha: string): Promise<string> {
	const outfile = join(outDir, outputName(target));

	const flags = [
		'--compile',
		`--target=${target}`,
		// Smaller download, and bytecode moves parsing to build time for a faster start.
		'--minify',
		'--bytecode',
		`--define:__BUILD_SHA__=${JSON.stringify(sha)}`,
		'--outfile',
		outfile,
	];

	await $`bun build ${entry} ${flags}`.cwd(repoRoot).quiet();

	return outfile;
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const explicit = args.includes('--target') ? args[args.indexOf('--target') + 1] : undefined;

if (explicit && !targets.includes(explicit as Target)) {
	process.stderr.write(`Unknown target ${explicit}.\nPick one of:\n  ${targets.join('\n  ')}\n`);
	process.exit(1);
}

const selected: Target[] = all ? [...targets] : [(explicit as Target) ?? hostTarget()];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const sha = await buildSha();
process.stdout.write(`${color.dim(`Building ${selected.length} target(s) from ${sha}`)}\n\n`);

for (const target of selected) {
	const started = Bun.nanoseconds();
	const outfile = await buildTarget(target, sha);
	const seconds = ((Bun.nanoseconds() - started) / 1e9).toFixed(1);
	process.stdout.write(
		`  ${color.green('✓')} ${target.padEnd(22)} ${color.dim(`${await humanSize(outfile)}  ${seconds}s`)}\n`,
	);
}

// Only the binary built for this machine can actually be run here, so that is the one
// checked. Every other target is checked by CI on a runner that matches it.
const host = selected.find((target) => target === hostTarget());
if (host) {
	const binary = join(outDir, outputName(host));
	const proc = Bun.spawn([binary, '--version'], { stdout: 'pipe', stderr: 'pipe' });
	const [stdout, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);

	if (code !== 0) {
		process.stderr.write(`\n${color.red('The built binary did not run.')}\n`);
		process.stderr.write(await new Response(proc.stderr).text());
		process.exit(1);
	}

	process.stdout.write(`\n  ${color.green('✓')} ran it, reports ${color.cyan(stdout.trim())}\n`);
}

process.stdout.write(`\n${color.dim(`Binaries are in ${outDir}`)}\n`);
