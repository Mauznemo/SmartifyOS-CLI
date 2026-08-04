import { visibleCommands } from '../commands/index.ts';
import { ExitCode } from '../utils/errors.ts';
import { renderRootHelp } from './help.ts';
import { intro, log, outro } from './output.ts';
import { isInteractive, select } from './prompt.ts';
import { theme } from './theme.ts';

/**
 * The guided menu, shown when someone runs `smartify-os` with nothing after it.
 *
 * This is the front door for anyone who does not know the commands yet, so it lists the
 * same things `--help` does, just pickable. Every entry here must map onto a command that
 * can also be run directly, nothing should be reachable only through the menu.
 */
export async function runMenu(): Promise<number> {
	const visible = visibleCommands();

	// A menu needs somebody to pick from it. Piped into a file or run from a script, the
	// friendliest thing this can be is the same list `--help` prints.
	if (!isInteractive()) {
		renderRootHelp(visible);
		return ExitCode.ok;
	}

	intro('Welcome');

	// `help` and `update` are about the tool, not about the car, so they do not count
	// towards it having anything to offer yet. This note takes itself down the day the
	// first real command lands.
	if (visible.every((c) => c.utility)) {
		log.info('There are no setup or build commands yet, this is the skeleton of the CLI.');
		log.message(theme.dim('The setup, build and deploy commands land here next.'));
	}

	if (visible.length === 0) {
		outro(`See you soon ${theme.dim('(nothing was changed)')}`);
		return ExitCode.ok;
	}

	const choice = await select({
		message: 'What would you like to do?',
		options: visible.map((c) => ({ value: c.name, label: c.summary, hint: c.name })),
	});

	const command = visible.find((c) => c.name === choice);
	if (!command) return ExitCode.error;

	await command.run({ flags: {}, positionals: [] });
	return ExitCode.ok;
}
