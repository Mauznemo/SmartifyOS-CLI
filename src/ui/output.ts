import * as clack from '@clack/prompts';
import { CliError } from '../utils/errors.ts';
import { brandName, theme } from './theme.ts';

/**
 * Everything the CLI prints goes through this file, so that no command has to think about
 * streams, colors or how an error should look.
 */

/** Write a line to stdout. This is the only place allowed to touch stdout directly. */
export function writeLine(line = ''): void {
	process.stdout.write(`${line}\n`);
}

/** Write a line to stderr, for anything that is not the actual output of a command. */
export function writeErrorLine(line = ''): void {
	process.stderr.write(`${line}\n`);
}

/** Opens a prompt session with the SmartifyOS header. */
export function intro(title?: string): void {
	clack.intro(title ? `${brandName()} ${theme.dim(theme.dim('·'))} ${title}` : brandName());
}

/** Closes a prompt session. */
export function outro(message: string): void {
	clack.outro(message);
}

/**
 * Prints an error the way the user should see it.
 *
 * A {@link CliError} is printed as its message plus its hint, because it describes
 * something the user can fix. Anything else is a bug in the CLI, so it gets the full
 * stack and a line asking the user to report it.
 */
export function renderError(error: unknown): void {
	if (error instanceof CliError) {
		clack.log.error(theme.error(error.message));
		if (error.hint) {
			clack.log.message(theme.dim(error.hint));
		}
		return;
	}

	const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
	clack.log.error(theme.error('SmartifyOS ran into an unexpected problem.'));
	clack.log.message(theme.dim(stack));
	clack.log.message(
		theme.dim(
			'This is a bug. Please report it at https://github.com/Mauznemo/SmartifyOS-CLI/issues',
		),
	);
}

export { log } from '@clack/prompts';
