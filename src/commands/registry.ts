import type { Command } from './types.ts';

/**
 * The list of commands the CLI knows about, and nothing else.
 *
 * This file deliberately imports no command. Commands are put in by index.ts, which is the
 * only file that knows they all exist. That is what lets a command print the help without
 * the help importing the command back.
 */

/** Every command the CLI knows about, in the order they appear in `--help`. */
export const commands: Command[] = [];

/** Adds commands to the list. Called once, from index.ts. */
export function register(...list: Command[]): void {
	commands.push(...list);
}

/** Finds a command by its name or one of its aliases. */
export function findCommand(name: string): Command | undefined {
	return commands.find((c) => c.name === name || c.aliases?.includes(name));
}

/** The commands worth showing in a list, in the order to show them. */
export function visibleCommands(): Command[] {
	const visible = commands.filter((c) => !c.hidden);
	// Setting up and building a car system is what someone came here for, so those go
	// first. `help` and `update` are about the tool itself and belong at the bottom.
	return [...visible.filter((c) => !c.utility), ...visible.filter((c) => c.utility)];
}
