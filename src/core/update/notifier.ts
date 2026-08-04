import { isNewer } from '../../utils/semver.ts';
import { version } from '../../utils/version.ts';
import { type CliState, readState, stateVersion, type UpdateState, writeState } from '../state.ts';
import { resolveLatestVersion } from './release.ts';

/**
 * Telling someone a newer SmartifyOS exists, without becoming a nuisance to them or to
 * GitHub.
 *
 * Two rules shape this. GitHub is asked at most once a day, and the answer is remembered
 * on disk, so running twenty commands in an afternoon is one request, not twenty. And
 * nothing in here is allowed to fail out loud: the user did not ask for this check, so it
 * must never be the reason a command they did ask for looks like it went wrong.
 */

/** How long an answer from GitHub is treated as still true. */
export const checkIntervalMs = 24 * 60 * 60 * 1000;

/** Internal: an environment variable counts as set unless it is empty or a flat no. */
function isTruthy(value: string | undefined): boolean {
	if (!value) return false;
	const normalised = value.trim().toLowerCase();
	return normalised !== '' && normalised !== '0' && normalised !== 'false';
}

/**
 * Whether the user has asked not to be told about updates.
 *
 * `SMARTIFY_OS_NO_UPDATE_CHECK` is ours. `NO_UPDATE_NOTIFIER` is what the rest of the
 * command line world already uses, and somebody who has turned this off everywhere else
 * meant it here too.
 */
export function updateCheckDisabled(env: Record<string, string | undefined>): boolean {
	return isTruthy(env.SMARTIFY_OS_NO_UPDATE_CHECK) || isTruthy(env.NO_UPDATE_NOTIFIER);
}

/** Whether it is time to ask GitHub again. */
export function shouldCheck(
	state: UpdateState | undefined,
	now: number,
	intervalMs: number = checkIntervalMs,
): boolean {
	const last = state?.lastCheckedAt;
	if (typeof last !== 'number' || !Number.isFinite(last)) return true;
	// A clock that has been put back would otherwise never be due again.
	if (last > now) return true;
	return now - last >= intervalMs;
}

/** Everything the check touches, handed in so that a test needs neither disk nor network. */
export interface NotifierDeps {
	currentVersion: string;
	now(): number;
	readState(): Promise<CliState>;
	writeState(state: CliState): Promise<void>;
	/** Undefined when it could not be worked out. Must never reject. */
	fetchLatestVersion(): Promise<string | undefined>;
	notify(latest: string, current: string): void;
}

/** The real dependencies, wired to the real disk and the real GitHub. */
export function hostNotifierDeps(notify: (latest: string, current: string) => void): NotifierDeps {
	return {
		currentVersion: version,
		now: () => Date.now(),
		readState: () => readState(),
		writeState: (state) => writeState(state),
		// A short leash. This runs after the user's command has already finished, so it is
		// the only thing standing between them and their prompt coming back.
		fetchLatestVersion: () => resolveLatestVersion({ timeoutMs: 2000 }),
		notify,
	};
}

/**
 * Says something if there is a newer version, and asks GitHub if it is time to.
 *
 * What was already known is said first, before any network call, so that a machine with no
 * internet still gets told and the notice never waits on a round trip.
 */
export async function checkForUpdate(deps: NotifierDeps): Promise<void> {
	const state = await deps.readState();
	const update = state.update ?? {};
	const now = deps.now();

	let alreadySaid: string | undefined;
	if (update.latestVersion && isNewer(update.latestVersion, deps.currentVersion)) {
		deps.notify(update.latestVersion, deps.currentVersion);
		alreadySaid = update.latestVersion;
	}

	if (!shouldCheck(update, now)) return;

	const latest = await deps.fetchLatestVersion();

	// The time is written down whether or not the check worked. Without that, a machine
	// with no internet would ask GitHub again on every single command.
	//
	// Not being able to write it down is not a reason to keep quiet about a new version,
	// so this cannot be allowed to skip what comes after it.
	try {
		await deps.writeState({
			...state,
			version: stateVersion,
			update: {
				...update,
				lastCheckedAt: now,
				...(latest ? { latestVersion: latest } : {}),
			},
		});
	} catch {
		// Remembering is a nicety. Telling the user is the point.
	}

	if (latest && latest !== alreadySaid && isNewer(latest, deps.currentVersion)) {
		deps.notify(latest, deps.currentVersion);
	}
}
