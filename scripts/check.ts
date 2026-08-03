#!/usr/bin/env bun
import { $ } from 'bun';
import color from 'picocolors';
import { repoRoot } from './targets.ts';

/**
 * Everything that has to be true before you push, in one command.
 *
 *   bun run check        lint, typecheck, test, and build for this machine
 *   bun run check --all  the same plus every published target, worth it before a release
 *
 * Run this instead of relying on CI. GitHub only checks pull requests and releases, so on
 * your own commits this is the safety net. It takes about two seconds.
 */

interface Check {
	name: string;
	run: () => Promise<unknown>;
}

const all = process.argv.includes('--all');

const checks: Check[] = [
	{ name: 'lint', run: () => $`bun run lint`.cwd(repoRoot).quiet() },
	{ name: 'typecheck', run: () => $`bun run typecheck`.cwd(repoRoot).quiet() },
	{ name: 'test', run: () => $`bun test`.cwd(repoRoot).quiet() },
	{
		name: all ? 'build (all targets)' : 'build',
		run: () =>
			all
				? $`bun run scripts/build.ts --all`.cwd(repoRoot).quiet()
				: $`bun run scripts/build.ts`.cwd(repoRoot).quiet(),
	},
];

process.stdout.write(`\n  ${color.cyan(color.bold('SmartifyOS'))} ${color.dim('check')}\n\n`);

const failures: { name: string; output: string }[] = [];

for (const check of checks) {
	const started = Bun.nanoseconds();
	try {
		await check.run();
		const seconds = ((Bun.nanoseconds() - started) / 1e9).toFixed(1);
		process.stdout.write(
			`  ${color.green('+')} ${check.name.padEnd(20)} ${color.dim(`${seconds}s`)}\n`,
		);
	} catch (error) {
		process.stdout.write(`  ${color.red('!')} ${check.name}\n`);
		// Bun's ShellError carries the failing command's output, which is the part worth
		// reading. Everything else is just this script's own stack.
		const shell = error as { stdout?: Buffer; stderr?: Buffer };
		const output = [shell.stdout?.toString() ?? '', shell.stderr?.toString() ?? ''].join('').trim();
		failures.push({ name: check.name, output: output || String(error) });
	}
}

if (failures.length === 0) {
	process.stdout.write(`\n  ${color.green('All good.')}\n\n`);
	process.exit(0);
}

for (const failure of failures) {
	process.stdout.write(`\n${color.red(`--- ${failure.name} ---`)}\n${failure.output}\n`);
}

const what = failures.map((f) => f.name).join(', ');
process.stdout.write(`\n  ${color.red(`Failed: ${what}`)}\n\n`);
process.exit(1);
