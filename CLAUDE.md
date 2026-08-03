The command line tool for SmartifyOS, the open source car infotainment system built in Flutter.

Its whole job is to hide `flutter`, `git`, `adb` and the rest from the end user. Someone building a system for their car should be able to do everything through this tool without knowing any of those exist, so every command has to be friendly, forgiving and hard to get wrong. The Flutter side lives in the separate SmartifyOS repo, this repo is only the CLI.

## Tech stack

- **Bun** is the runtime, bundler, test runner and package manager. `bun build --compile` produces one standalone binary per platform, so users install nothing else.
- **TypeScript**, strict, with `noUncheckedIndexedAccess`.
- **@clack/prompts** for everything interactive. It has `spinner`, `progress`, `tasks`, `taskLog`, `group` and `box`, use them rather than writing your own.
- **picocolors** for color, always through `src/ui/theme.ts`.
- **Biome** for linting and formatting, `tsc --noEmit` for typechecking (Bun does not typecheck).
- Arguments are parsed with `parseArgs` from `node:util`, no dependency. Help output is rendered by hand in `src/cli.ts` so it matches the clack look.

Runtime dependencies are deliberately kept to two. Think before adding a third.

## Structure

```
src/index.ts        entry point, the only place that ends the process
src/cli.ts          parse() and run(), plus help rendering
src/commands/       one file per command, listed in commands/index.ts
src/ui/             anything that talks to the terminal
src/core/           process runners, config, paths, the real work
src/utils/          small helpers with no opinion about the terminal
scripts/build.ts    cross compiles every target
```

- **`src/core/` must never import `@clack/prompts`.** Logic stays testable without a TTY and reusable from a non interactive run. Only `src/ui/` and `src/commands/` touch the terminal.
- **Every command has to work non interactively.** Flags supply the answers, prompts only fill in what is missing. Prompting when nobody can answer throws instead of hanging, see `assertInteractive` in `src/ui/prompt.ts`.
- **Never call a clack prompt directly**, go through `src/ui/prompt.ts`. Those wrappers turn Ctrl+C into a `CancelledError` so no command has to check `isCancel` itself.
- **Never print with `console.log`**, use `writeLine` or the `log` helpers from `src/ui/output.ts`. Biome fails the build on `console`.
- **Failures throw `CliError`** from `src/utils/errors.ts` with a message saying what went wrong and a `hint` saying what to do about it. Commands return nothing on success, the exit code comes from the error.

## Writing style

- Never use em dashes (—) or en dashes (–), anywhere: not in UI strings, docs, normal comments, or markdown. Use a comma, parentheses, or a separate sentence instead. This is checked by `tests/dashes.test.ts`, which scans the whole repo and fails on either character.
- Spell the project name out in full, `SmartifyOS` or `smartify-os`, never `Smartify` on its own.

## Working on it

```bash
bun install
bun run dev -- --help     # run from source
bun test                  # unit tests, the dash rule, and a real subprocess smoke test
bun run typecheck
bun run format            # Biome, fixes what it can
bun run build             # one binary for this machine, then runs it
bun run build:all         # all eight published targets
bun run install:dev       # put smartify-os on your PATH, running live from src
bun run install:local     # same, but the real compiled binary
```

`install:dev` and `install:local` both install to `~/.smartify-os/bin` and add the same PATH line the real installer does, so they replace each other and a later `curl | bash` replaces them. Use `install:dev` while working, since it needs no rebuild, and `install:local` to check the thing a user actually gets.

`bun build --compile --bytecode` has no top level await, which is why `src/index.ts` calls `main().then(...)` instead of awaiting.

Releases are cut by pushing a `v*` tag that matches the version in package.json. CI builds every target, signs the macOS ones on a Mac, publishes them, then installs the result on Linux, macOS, Windows and Alpine to prove the install scripts still work.

## Keeping this file useful

Update this file when something here stops being true or when a new rule will matter in **every** later session. Do not clutter it with one off details or things that are easy to work out from the code. If something one off needs explaining, a doc comment is the right place.
