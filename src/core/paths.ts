import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Where the CLI keeps the few things it has to remember between runs.
 *
 * Everything goes under one folder, the same one the installers put the binary in, so that
 * deleting that folder is a complete uninstall with nothing left behind.
 */

/** The bits of the outside world the paths depend on, so a test can supply its own. */
export interface PathEnv {
	platform: NodeJS.Platform;
	home: string;
	/** `%LOCALAPPDATA%`, only used on Windows. */
	localAppData: string | undefined;
	/** `SMARTIFY_OS_STATE_DIR`, which wins over everything else. */
	override: string | undefined;
}

/** Reads the real environment. */
export function hostPathEnv(): PathEnv {
	return {
		platform: process.platform,
		home: homedir(),
		localAppData: process.env.LOCALAPPDATA,
		override: process.env.SMARTIFY_OS_STATE_DIR,
	};
}

/**
 * The folder the CLI owns.
 *
 * `~/.smartify-os` on macOS and Linux, next to the `bin` folder install.sh creates.
 * `%LOCALAPPDATA%\SmartifyOS` on Windows, which is where install.ps1 puts its `bin`.
 */
export function stateDir(env: PathEnv = hostPathEnv()): string {
	if (env.override) return env.override;

	if (env.platform === 'win32') {
		return env.localAppData
			? join(env.localAppData, 'SmartifyOS')
			: join(env.home, 'AppData', 'Local', 'SmartifyOS');
	}

	return join(env.home, '.smartify-os');
}

/** The one file the CLI writes. */
export function statePath(env: PathEnv = hostPathEnv()): string {
	return join(stateDir(env), 'state.json');
}
