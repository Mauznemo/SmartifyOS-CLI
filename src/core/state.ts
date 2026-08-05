import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { statePath } from './paths.ts';

/**
 * The small amount the CLI remembers between runs, currently just when it last asked
 * GitHub about a new version.
 *
 * Nothing in here is allowed to throw. This file is a convenience, not something the user
 * asked for, so a missing, corrupt or unwritable one has to be shrugged off rather than
 * turned into an error on a screen where it would make no sense.
 */

/** Bumped when the shape changes, so an old file is thrown away rather than tripped over. */
export const stateVersion = 1;

/** What the check for a newer CLI remembers. */
export interface SelfUpdateState {
	/** Epoch milliseconds of the last time GitHub was asked. */
	lastCheckedAt?: number;
	/** The newest version GitHub reported, with no leading `v`. */
	latestVersion?: string;
}

export interface CliState {
	version: number;
	/** Named for the CLI's own version, so the car project can have its own key later. */
	selfUpdate?: SelfUpdateState;
}

/** A state with nothing in it yet. */
function emptyState(): CliState {
	return { version: stateVersion };
}

/**
 * Reads the file contents into a state, keeping only fields that are what they claim to be.
 *
 * This file lives in the user's home folder and anything at all could have happened to it,
 * so nothing in it is trusted. A field of the wrong type is dropped, not coerced.
 */
export function parseState(text: string): CliState {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return emptyState();
	}

	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return emptyState();

	const record = raw as Record<string, unknown>;
	if (record.version !== stateVersion) return emptyState();

	const state = emptyState();
	const selfUpdate = record.selfUpdate;
	if (typeof selfUpdate === 'object' && selfUpdate !== null && !Array.isArray(selfUpdate)) {
		const fields = selfUpdate as Record<string, unknown>;
		const kept: SelfUpdateState = {};
		if (typeof fields.lastCheckedAt === 'number' && Number.isFinite(fields.lastCheckedAt)) {
			kept.lastCheckedAt = fields.lastCheckedAt;
		}
		if (typeof fields.latestVersion === 'string') {
			kept.latestVersion = fields.latestVersion;
		}
		state.selfUpdate = kept;
	}

	return state;
}

export function serializeState(state: CliState): string {
	return `${JSON.stringify(state, null, '\t')}\n`;
}

/** Reads the state. A missing or unreadable file is simply a state with nothing in it. */
export async function readState(path: string = statePath()): Promise<CliState> {
	try {
		return parseState(await Bun.file(path).text());
	} catch {
		return emptyState();
	}
}

/**
 * Writes the state, and says nothing if it cannot.
 *
 * Written to a temporary file next to the real one and renamed over it, so a machine that
 * loses power halfway through leaves the old file intact rather than half of a new one.
 */
export async function writeState(state: CliState, path: string = statePath()): Promise<void> {
	const temporary = `${path}.tmp`;
	try {
		await mkdir(dirname(path), { recursive: true });
		await writeFile(temporary, serializeState(state));
		await rename(temporary, path);
	} catch {
		// Not being able to remember when we last checked is not worth telling anyone about.
	}
}
