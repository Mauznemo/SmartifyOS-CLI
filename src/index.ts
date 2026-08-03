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
/**
 * Internal: `smartify-os --help | head` closes the pipe while we are still writing to it.
 * That is normal use, not a failure, so the write that lands afterwards has to be ignored
 * rather than turned into a stack trace in the user's face.
 */
function ignoreClosedPipes(): void {
	for (const stream of [process.stdout, process.stderr]) {
		stream.on('error', (error: NodeJS.ErrnoException) => {
			if (error.code === 'EPIPE') process.exit(ExitCode.ok);
			throw error;
		});
	}
}

async function main(): Promise<number> {
	try {
		return await run(process.argv.slice(2));
	} catch (error) {
		if (error instanceof CancelledError) {
			clack.cancel('Cancelled, nothing was changed.');
			return ExitCode.cancelled;
		}
		if ((error as NodeJS.ErrnoException)?.code === 'EPIPE') return ExitCode.ok;
		renderError(error);
		return error instanceof CliError ? error.exitCode : ExitCode.error;
	}
}

ignoreClosedPipes();

// Called rather than awaited at the top level, because compiling to a standalone binary
// produces a format that has no top level await.
main().then((code) => {
	process.exitCode = code;
});
