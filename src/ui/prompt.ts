import type {
	ConfirmOptions,
	MultiSelectOptions,
	PasswordOptions,
	SelectOptions,
	TextOptions,
} from '@clack/prompts';
import * as clack from '@clack/prompts';
import { CancelledError, CliError } from '../utils/errors.ts';

/**
 * Every prompt in the CLI goes through this file.
 *
 * Two things happen here that would otherwise be repeated in every command. Ctrl+C turns
 * into a {@link CancelledError} instead of a symbol you have to remember to check, and a
 * prompt asked when nobody can answer it (piped output, CI, `--yes`) fails with a clear
 * message rather than hanging forever.
 */

/**
 * Internal: turns clack's cancel symbol into a thrown {@link CancelledError}.
 */
function unwrap<T>(value: T | symbol): T {
	if (clack.isCancel(value)) {
		throw new CancelledError();
	}
	return value as T;
}

/**
 * Whether the user can actually answer a prompt right now.
 *
 * False when output is piped somewhere, when running in CI, or when the user passed
 * `--yes`. Commands should use this to decide between asking and using a default.
 */
export function isInteractive(): boolean {
	return clack.isTTY(process.stdout) && !clack.isCI();
}

/**
 * Internal: called before every prompt so a non interactive run fails loudly and early
 * instead of hanging on a question nobody will see.
 */
function assertInteractive(message: string): void {
	if (isInteractive()) return;
	throw new CliError(`Needed to ask "${message}" but there is nobody to answer.`, {
		hint: 'Pass the answer as a flag, or run this in a normal terminal.',
	});
}

/** Ask for a line of text. */
export async function text(opts: TextOptions): Promise<string> {
	assertInteractive(opts.message);
	return unwrap(await clack.text(opts));
}

/** Ask for a line of text, masked while typing. */
export async function password(opts: PasswordOptions): Promise<string> {
	assertInteractive(opts.message);
	return unwrap(await clack.password(opts));
}

/** Ask a yes or no question. */
export async function confirm(opts: ConfirmOptions): Promise<boolean> {
	assertInteractive(opts.message);
	return unwrap(await clack.confirm(opts));
}

/** Ask the user to pick one option. */
export async function select<Value>(opts: SelectOptions<Value>): Promise<Value> {
	assertInteractive(opts.message);
	return unwrap(await clack.select(opts));
}

/** Ask the user to pick any number of options. */
export async function multiselect<Value>(opts: MultiSelectOptions<Value>): Promise<Value[]> {
	assertInteractive(opts.message);
	return unwrap(await clack.multiselect(opts));
}

export { box, group, note, progress, spinner, taskLog, tasks } from '@clack/prompts';
