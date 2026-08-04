import { renderCommandHelp, renderRootHelp } from '../ui/help.ts';
import { theme } from '../ui/theme.ts';
import { CliError } from '../utils/errors.ts';
import { closest } from '../utils/suggest.ts';
import { binaryName } from './flags.ts';
import { findCommand, visibleCommands } from './registry.ts';
import type { Command } from './types.ts';

/**
 * The same thing `--help` prints, reachable by typing a word.
 *
 * Someone who has never used a command line before will try `help` long before they try
 * `--help`, so both have to work and both have to say the same thing.
 */
export const helpCommand: Command = {
	name: 'help',
	summary: 'Show what SmartifyOS can do',
	description: 'Lists everything SmartifyOS can do, or explains one command in detail.',
	examples: [`${binaryName} help`, `${binaryName} help update`],
	utility: true,
	run({ positionals }) {
		const name = positionals[0];

		if (!name) {
			renderRootHelp(visibleCommands());
			return;
		}

		const command = findCommand(name);
		if (!command) {
			// Worded the same as the unknown command error in src/cli.ts, so a typo reads
			// the same however it was made.
			const suggestion = closest(
				name,
				visibleCommands().map((c) => c.name),
			);
			throw new CliError(`There is no command called ${theme.strong(name)}.`, {
				hint: suggestion
					? `Did you mean ${theme.code(`${binaryName} help ${suggestion}`)}?`
					: `Run ${theme.code(`${binaryName} help`)} to see everything it can do.`,
			});
		}

		renderCommandHelp(command);
	},
};
