import { binaryName } from '../commands/flags.ts';
import { isUpdatable } from '../core/update/install.ts';
import { checkForUpdate, hostNotifierDeps, updateCheckDisabled } from '../core/update/notifier.ts';
import { canShowNotice, writeErrorLine } from './output.ts';
import { symbols, theme } from './theme.ts';

/**
 * The one line that tells somebody a newer SmartifyOS exists.
 *
 * Written for a person who has never installed anything from a terminal. It says what
 * happened and the exact words to type, and nothing else. No changelog to go and read, no
 * package manager incantation to translate, no box to dismiss.
 */
export function renderUpdateNotice(latest: string, current: string): void {
	// stderr, not stdout, so that `smartify-os --version` piped into something else keeps
	// producing exactly the one clean line that was asked for.
	writeErrorLine();
	writeErrorLine(
		`  ${theme.brand(symbols.arrow)} A newer SmartifyOS CLI version is out: ${theme.dim(current)} ${theme.dim(symbols.arrow)} ${theme.strong(theme.success(latest))}`,
	);
	writeErrorLine(
		`    Run ${theme.code(`${binaryName} update`)} to get it, it takes a few seconds.`,
	);
	writeErrorLine();
}

/**
 * Runs the once a day check and says something if there is news.
 *
 * Never throws and never prints when nobody is watching. Called after the user's command
 * has finished, so it cannot slow anything down that they actually asked for.
 */
export async function maybeNotifyAboutUpdate(): Promise<void> {
	if (updateCheckDisabled(process.env)) return;
	if (!canShowNotice()) return;
	// Running from the source tree, there is nothing an update would replace.
	if (!isUpdatable()) return;

	await checkForUpdate(hostNotifierDeps(renderUpdateNotice));
}
