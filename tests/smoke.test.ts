import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

/**
 * Runs the CLI the way a user does, as a real process.
 *
 * The unit tests cover the parsing, this covers the wiring: the entry point, the exit
 * codes, and that output actually reaches a pipe instead of getting cut off.
 */

const entry = join(import.meta.dir, '..', 'src', 'index.ts');

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn([process.execPath, 'run', entry, ...args], {
		stdout: 'pipe',
		stderr: 'pipe',
		// Force colors off so assertions match plain text.
		env: { ...process.env, NO_COLOR: '1' },
	});

	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	return { code, stdout, stderr };
}

describe('smartify-os', () => {
	test('--version prints a version and exits cleanly', async () => {
		const { code, stdout } = await runCli(['--version']);
		expect(code).toBe(0);
		expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+ \(.+\)$/);
	});

	test('--help lists the usage and exits cleanly', async () => {
		const { code, stdout } = await runCli(['--help']);
		expect(code).toBe(0);
		expect(stdout).toContain('SmartifyOS');
		expect(stdout).toContain('Usage');
		expect(stdout).toContain('smartify-os <command> [options]');
		expect(stdout).toContain('--version');
	});

	test('an unknown command fails with a readable message', async () => {
		const { code, stdout, stderr } = await runCli(['nonsense']);
		expect(code).toBe(1);
		expect(stdout + stderr).toContain('There is no command called nonsense');
	});

	test('an unknown flag fails with a readable message', async () => {
		const { code, stdout, stderr } = await runCli(['--nope']);
		expect(code).toBe(1);
		expect(stdout + stderr).toContain("Unknown option '--nope'");
	});

	test('no arguments outside a terminal still exits cleanly', async () => {
		const { code, stdout } = await runCli([]);
		expect(code).toBe(0);
		expect(stdout).toContain('SmartifyOS');
	});

	// `smartify-os --help | head` closes the pipe early. That has to be silent, not an
	// EPIPE stack trace. It showed up first on Linux, where the pipe timing differs.
	test('a reader that closes the pipe early is not an error', async () => {
		const proc = Bun.spawn(['sh', '-c', `"${process.execPath}" run "${entry}" --help | head -2`], {
			stdout: 'pipe',
			stderr: 'pipe',
			env: { ...process.env, NO_COLOR: '1' },
		});

		const [stderr, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);

		expect(code).toBe(0);
		expect(stderr).not.toContain('EPIPE');
	});
});
