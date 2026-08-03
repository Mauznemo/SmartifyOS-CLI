import pkg from '../../package.json' with { type: 'json' };

/** Version of the CLI, taken from package.json at build time. */
export const version: string = pkg.version;

/**
 * Short git commit this binary was built from, or `'dev'` when running from source.
 *
 * Internal: `__BUILD_SHA__` is replaced by scripts/build.ts with `--define`, so the
 * `typeof` guard is what keeps `bun run src/index.ts` working without a build step.
 */
export const buildSha: string = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'dev';

/** Version string as shown by `smartify-os --version`, for example `0.1.0 (a1b2c3d)`. */
export function versionString(): string {
	return `${version} (${buildSha})`;
}
