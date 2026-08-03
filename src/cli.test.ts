import { describe, expect, test } from 'bun:test';
import { parse } from './cli.ts';
import { commands } from './commands/index.ts';
import type { Command } from './commands/types.ts';
import { CliError } from './utils/errors.ts';

/** Internal: adds a command for the length of one test, then takes it back out again. */
function withCommand<T>(command: Command, body: () => T): T {
	commands.push(command);
	try {
		return body();
	} finally {
		commands.splice(commands.indexOf(command), 1);
	}
}

const example: Command = {
	name: 'build',
	aliases: ['b'],
	summary: 'Build your system for the car',
	flags: {
		release: { type: 'boolean', describe: 'Build in release mode' },
		device: { type: 'string', describe: 'Which car to build for' },
	},
	run() {},
};

describe('parse', () => {
	test('no arguments opens the guided menu', () => {
		expect(parse([])).toEqual({ kind: 'menu' });
	});

	test('reports the version', () => {
		expect(parse(['--version'])).toEqual({ kind: 'version' });
		expect(parse(['-v'])).toEqual({ kind: 'version' });
	});

	test('asks for help with no command', () => {
		expect(parse(['--help'])).toEqual({ kind: 'help', command: undefined });
		expect(parse(['-h'])).toEqual({ kind: 'help', command: undefined });
	});

	test('finds a command by name and by alias', () => {
		withCommand(example, () => {
			const byName = parse(['build']);
			const byAlias = parse(['b']);
			expect(byName.kind).toBe('command');
			expect(byAlias.kind).toBe('command');
			if (byName.kind === 'command') expect(byName.command.name).toBe('build');
			if (byAlias.kind === 'command') expect(byAlias.command.name).toBe('build');
		});
	});

	test('reads the flags of a command', () => {
		withCommand(example, () => {
			const result = parse(['build', '--release', '--device', 'miata', 'extra']);
			expect(result.kind).toBe('command');
			if (result.kind !== 'command') return;
			expect(result.flags.release).toBe(true);
			expect(result.flags.device).toBe('miata');
			expect(result.positionals).toEqual(['extra']);
		});
	});

	test('accepts global flags before the command name', () => {
		withCommand(example, () => {
			const result = parse(['--yes', 'build']);
			expect(result.kind).toBe('command');
			if (result.kind !== 'command') return;
			expect(result.flags.yes).toBe(true);
		});
	});

	test('--help after a command asks for that command instead of running it', () => {
		withCommand(example, () => {
			const result = parse(['build', '--help']);
			expect(result.kind).toBe('help');
			if (result.kind !== 'help') return;
			expect(result.command?.name).toBe('build');
		});
	});

	test('an unknown command comes back with a suggestion', () => {
		withCommand(example, () => {
			const result = parse(['buld']);
			expect(result).toEqual({ kind: 'unknown', name: 'buld', suggestion: 'build' });
		});
	});

	test('an unknown command with nothing close by has no suggestion', () => {
		withCommand(example, () => {
			const result = parse(['definitelynotacommand']);
			expect(result.kind).toBe('unknown');
			if (result.kind !== 'unknown') return;
			expect(result.suggestion).toBeUndefined();
		});
	});

	test('an unknown flag is a readable error, not a stack trace', () => {
		withCommand(example, () => {
			expect(() => parse(['build', '--nope'])).toThrow(CliError);
			try {
				parse(['build', '--nope']);
			} catch (error) {
				expect(error).toBeInstanceOf(CliError);
				const cliError = error as CliError;
				expect(cliError.message).toBe("Unknown option '--nope'.");
				expect(cliError.hint).toContain('--help');
			}
		});
	});

	test('a flag belonging to another command is still unknown', () => {
		withCommand(example, () => {
			expect(() => parse(['build', '--flash'])).toThrow(CliError);
		});
	});
});
