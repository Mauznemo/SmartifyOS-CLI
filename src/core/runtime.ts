import { realpathSync } from 'node:fs';

/**
 * What kind of thing this process actually is, which decides whether it can replace itself.
 */

// A compiled binary serves its own source out of a virtual filesystem, which every module
// inside it reports as its path: `/$bunfs/root/...` on macOS and Linux, `B:\~BUN\root\...`
// on Windows. Running from source reports a real path on disk.
const virtualRoot = /(^|[/\\])(\$bunfs|~BUN)[/\\]/;

/**
 * Whether this is a `bun build --compile` binary rather than a run from the source tree.
 *
 * `process.execPath` is not enough on its own. `bun run install:dev` writes a shell shim
 * called `smartify-os` that hands straight over to the TypeScript, and that has to count as
 * source, because there is no binary there to replace.
 */
export function isCompiledBinary(): boolean {
	return virtualRoot.test(import.meta.path);
}

/**
 * The file on disk that is running, with symlinks resolved.
 *
 * Resolving matters: if someone has linked the binary into /usr/local/bin, the real file is
 * what has to be replaced, not the link pointing at it.
 */
export function currentBinaryPath(): string {
	try {
		return realpathSync(process.execPath);
	} catch {
		return process.execPath;
	}
}
