import {
	applyUpdate,
	type InstallStep,
	isUpdatable,
	planUpdate,
	type UpdatePlan,
} from '../core/update/install.ts';
import { intro, log, outro } from '../ui/output.ts';
import { confirm, spinner } from '../ui/prompt.ts';
import { theme } from '../ui/theme.ts';
import { CliError } from '../utils/errors.ts';
import { isNewer } from '../utils/semver.ts';
import { binaryName } from './flags.ts';
import type { Command } from './types.ts';

/** What each step of an install is called while it is happening. */
const stepText: Record<InstallStep, string> = {
	download: 'Downloading',
	verify: 'Checking the download is intact',
	unpack: 'Unpacking',
	check: 'Making sure it runs on this machine',
	swap: 'Putting it in place',
};

export const updateCommand: Command = {
	name: 'update',
	aliases: ['upgrade'],
	summary: 'Update SmartifyOS to the newest version',
	description:
		'Downloads the newest SmartifyOS, checks it against its published checksum, runs it to make sure it works on this machine, and only then replaces the one you have.',
	examples: [
		`${binaryName} update`,
		`${binaryName} update --check`,
		`${binaryName} update --to 0.2.0`,
	],
	flags: {
		check: { type: 'boolean', describe: 'Only say whether there is a newer version' },
		to: { type: 'string', describe: 'Install one particular version, for example 0.2.0' },
	},
	utility: true,
	async run({ flags }) {
		if (!isUpdatable()) {
			throw new CliError(
				'This SmartifyOS runs from its source code, so there is nothing to replace.',
				{
					hint: `Run ${theme.code('git pull')} in the CLI repo instead.`,
				},
			);
		}

		const to = typeof flags.to === 'string' ? flags.to : undefined;

		intro('Update');

		const looking = spinner();
		looking.start(to ? `Looking for ${to}` : 'Looking for the newest version');
		let plan: UpdatePlan;
		try {
			plan = await planUpdate({ to, baseUrl: process.env.SMARTIFY_OS_BASE_URL });
		} catch (error) {
			looking.error('Could not check');
			throw error;
		}
		looking.stop(`Newest is ${theme.strong(plan.targetVersion)}`);

		// Without --to, there is nothing to do unless GitHub has something newer. With --to,
		// the user named a version, so install exactly that one, up, down or sideways.
		if (!to && !isNewer(plan.targetVersion, plan.currentVersion)) {
			outro(`You already have the newest version ${theme.dim(`(${plan.currentVersion})`)}`);
			return;
		}

		if (flags.check === true) {
			log.info(
				`Version ${theme.strong(plan.targetVersion)} is available, you have ${plan.currentVersion}.`,
			);
			outro(`Run ${theme.code(`${binaryName} update`)} when you are ready.`);
			return;
		}

		const go =
			flags.yes === true ||
			(await confirm({
				message: `Update from ${plan.currentVersion} to ${plan.targetVersion}?`,
				initialValue: true,
			}));

		if (!go) {
			outro(`Left as it is ${theme.dim('(nothing was changed)')}`);
			return;
		}

		const work = spinner();
		work.start(stepText.download);
		try {
			await applyUpdate(plan, {
				onStep: (step) => work.message(stepText[step]),
				onProgress: (received, total) => work.message(downloadedSoFar(received, total)),
			});
		} catch (error) {
			work.error('Stopped');
			throw error;
		}
		work.stop(`Updated to ${theme.success(theme.strong(plan.targetVersion))}`);

		outro('All done. The next command you run is the new one.');
	},
};

/** Internal: the download line, as a percentage when the size is known and MB when it is not. */
function downloadedSoFar(received: number, total: number): string {
	const megabytes = (received / 1024 / 1024).toFixed(1);
	if (total <= 0) return `${stepText.download} ${theme.dim(`${megabytes} MB`)}`;

	const percent = Math.floor((received / total) * 100);
	return `${stepText.download} ${theme.dim(`${percent}%`)}`;
}
