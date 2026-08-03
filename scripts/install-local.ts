#!/usr/bin/env bun
import { appendFile, chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import color from 'picocolors';
import { hostTarget, installedName, outDir, outputName, repoRoot } from './targets.ts';

/**
 * Puts `smartify-os` on your PATH from this checkout, so you can try it in a real terminal
 * from inside a real car project instead of from the repo folder.
 *
 *   bun run install:dev      a shim that runs straight from src, edits are live
 *   bun run install:local    the actual compiled binary, what a user would get
 *
 * It installs to the same place and edits PATH the same way the real installer does, so a
 * later `curl | bash` install replaces this cleanly rather than sitting next to it.
 */

const installDir = join(homedir(), '.smartify-os', 'bin');
const installPath = join(installDir, installedName);

// The same marker the real installer uses, so the two never both add a PATH line.
const marker = '# added by the SmartifyOS installer';

const dev = process.argv.includes('--dev');

function step(message: string): void {
	process.stdout.write(`  ${color.cyan('*')} ${message}\n`);
}

function ok(message: string): void {
	process.stdout.write(`  ${color.green('+')} ${message}\n`);
}

/** Installs a tiny script that hands straight over to the source, with no build step. */
async function installShim(): Promise<void> {
	if (process.platform === 'win32') {
		process.stderr.write(
			`  ${color.yellow('!')} --dev needs a POSIX shell, building the real binary instead.\n`,
		);
		await installBinary();
		return;
	}

	const shim = [
		'#!/bin/sh',
		'# Written by `bun run install:dev` in the SmartifyOS CLI repo.',
		'# It runs the TypeScript directly, so your edits are live with no rebuild.',
		`exec ${JSON.stringify(process.execPath)} run ${JSON.stringify(join(repoRoot, 'src', 'index.ts'))} "$@"`,
		'',
	].join('\n');

	await writeFile(installPath, shim);
	await chmod(installPath, 0o755);
	ok(`shim installed, running from ${color.dim(join(repoRoot, 'src'))}`);
}

/** Builds the real binary for this machine and installs that. */
async function installBinary(): Promise<void> {
	step('building');
	await $`bun run scripts/build.ts`.cwd(repoRoot).quiet();

	const built = join(outDir, outputName(hostTarget()));
	await copyFile(built, installPath);
	await chmod(installPath, 0o755);
	ok('binary installed');
}

/**
 * Adds the install dir to one shell config, but only once. Returns true if anything was
 * written, which is what decides whether the user has to open a new terminal.
 */
async function addToShellConfig(config: string, line: string): Promise<boolean> {
	let existing: string;
	try {
		existing = await readFile(config, 'utf8');
	} catch {
		// Only touch config files that already exist, creating new ones is too intrusive.
		return false;
	}

	if (existing.includes(marker)) return false;

	await appendFile(config, `\n${marker}\n${line}\n`);
	ok(`added it to ${config.replace(homedir(), '~')}`);
	return true;
}

async function setupPath(): Promise<'ready' | 'changed'> {
	if ((process.env.PATH ?? '').split(':').includes(installDir)) return 'ready';

	const line = `export PATH="${installDir}:$PATH"`;
	let changed = false;

	for (const config of ['.zshrc', '.bashrc', '.bash_profile', '.profile']) {
		if (await addToShellConfig(join(homedir(), config), line)) changed = true;
	}

	const fish = join(homedir(), '.config', 'fish', 'config.fish');
	if (await addToShellConfig(fish, `fish_add_path "${installDir}"`)) changed = true;

	return changed ? 'changed' : 'ready';
}

process.stdout.write(
	`\n  ${color.cyan(color.bold('SmartifyOS'))} ${color.dim('local install')}\n\n`,
);

await mkdir(installDir, { recursive: true });

if (dev) {
	await installShim();
} else {
	await installBinary();
}

const reported = (await $`${installPath} --version`.quiet()).text().trim();
ok(`it runs, reports ${color.cyan(reported)}`);

const pathStatus = await setupPath();

process.stdout.write('\n');
if (pathStatus === 'changed') {
	process.stdout.write('  Open a new terminal, then run it from anywhere:\n');
} else {
	process.stdout.write('  Run it from anywhere:\n');
}
process.stdout.write(`\n    ${color.cyan('smartify-os')}\n\n`);

if (dev) {
	process.stdout.write(`  ${color.dim('Your edits take effect straight away, no rebuild.')}\n\n`);
} else {
	process.stdout.write(`  ${color.dim('Run this again after changing anything.')}\n\n`);
}
