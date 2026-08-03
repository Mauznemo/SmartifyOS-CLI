#!/usr/bin/env bun
import * as clack from '@clack/prompts';
import { run } from './cli.ts';
import { renderError } from './ui/output.ts';
import { CancelledError, CliError, ExitCode } from './utils/errors.ts';

/**
 * The entry point, and the only place in the CLI that ends the process.
 *
 * Everything below it returns an exit code or throws, which is what lets the whole
 * command line be driven from a test without spawning anything.
 */
async function main(): Promise<number> {
	try {
		return await run(process.argv.slice(2));
	} catch (error) {
		if (error instanceof CancelledError) {
			clack.cancel('Cancelled, nothing was changed.');
			return ExitCode.cancelled;
		}
		renderError(error);
		return error instanceof CliError ? error.exitCode : ExitCode.error;
	}
}

// Called rather than awaited at the top level, because `bun build --bytecode` compiles to
// a format that has no top level await.
main().then((code) => {
	process.exitCode = code;
});
