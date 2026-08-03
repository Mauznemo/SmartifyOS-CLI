import { commands } from '../commands/index.ts';
import { ExitCode } from '../utils/errors.ts';
import { intro, log, outro } from './output.ts';
import { select } from './prompt.ts';
import { theme } from './theme.ts';

/**
 * The guided menu, shown when someone runs `smartify-os` with nothing after it.
 *
 * This is the front door for anyone who does not know the commands yet, so it lists the
 * same things `--help` does, just pickable. Every entry here must map onto a command that
 * can also be run directly, nothing should be reachable only through the menu.
 */
export async function runMenu(): Promise<number> {
	intro('Welcome');

	const visible = commands.filter((c) => !c.hidden);

	if (visible.length === 0) {
		log.info('There are no commands yet, this is the skeleton of the CLI.');
		log.message(theme.dim('The setup, build and deploy commands land here next.'));
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
