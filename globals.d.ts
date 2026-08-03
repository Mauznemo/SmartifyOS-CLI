/**
 * Short git commit the binary was built from. Injected at build time by
 * scripts/build.ts with `--define`. It is `'dev'` when running from source.
 */
declare const __BUILD_SHA__: string;
