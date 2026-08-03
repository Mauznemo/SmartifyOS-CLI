import type { Command } from './types.ts';

/**
 * Every command the CLI knows about, in the order they appear in `--help`.
 *
 * To add one, write it in its own file in this folder and put it in this list. The order
 * here is the order the user reads, so keep the common ones first.
 */
export const commands: Command[] = [];

/** Finds a command by its name or one of its aliases. */
export function findCommand(name: string): Command | undefined {
	return commands.find((c) => c.name === name || c.aliases?.includes(name));
}
