import { describe, expect, test } from 'bun:test';
import { CancelledError, CliError, ExitCode } from './errors.ts';

describe('CliError', () => {
	test('defaults to exit code 1', () => {
		expect(new CliError('Something broke.').exitCode).toBe(ExitCode.error);
	});

	test('keeps the hint and a custom exit code', () => {
		const error = new CliError('Flutter is missing.', {
			hint: 'Run smartify-os doctor.',
			exitCode: 3,
		});
		expect(error.hint).toBe('Run smartify-os doctor.');
		expect(error.exitCode).toBe(3);
	});

	test('keeps the underlying cause', () => {
		const cause = new Error('ENOENT');
		expect(new CliError('Could not read the project.', { cause }).cause).toBe(cause);
	});

	test('is an Error, so it can be thrown and caught like one', () => {
		expect(new CliError('x')).toBeInstanceOf(Error);
		expect(new CliError('x').name).toBe('CliError');
	});
});

describe('CancelledError', () => {
	test('uses the shell convention for Ctrl+C', () => {
		expect(ExitCode.cancelled).toBe(130);
	});

	test('is its own type, so the boundary can tell it apart from a real failure', () => {
		expect(new CancelledError()).toBeInstanceOf(Error);
		expect(new CancelledError()).not.toBeInstanceOf(CliError);
	});
});
