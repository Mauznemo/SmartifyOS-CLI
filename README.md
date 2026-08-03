# SmartifyOS CLI

The command line tool for [SmartifyOS](https://smartify-os.com/), the open source car infotainment system built in Flutter.

It does the complicated parts for you. You should never have to touch `flutter`, `git` or `adb` to build a system for your car.

> [!NOTE]
> This is the very beginning. The tool installs, runs and builds, but the commands themselves are still on their way.

## Install

**macOS and Linux**

```bash
curl -fsSL https://smartify-os.com/install.sh | bash
```

**Windows**

```powershell
irm https://smartify-os.com/install.ps1 | iex
```

Nothing else is needed, no Node, no Bun, no package manager. The installer downloads a single file, checks it against its published checksum, puts it in your home folder and adds it to your PATH. It never asks for sudo or administrator rights.

Then open a new terminal and run:

```bash
smartify-os
```

### Options

Set these before running the installer if you want something other than the defaults.

| Variable | What it does |
| --- | --- |
| `SMARTIFY_OS_VERSION` | Install a specific release, for example `v0.1.0`, instead of the newest |
| `SMARTIFY_OS_INSTALL_DIR` | Install somewhere other than `~/.smartify-os/bin` |
| `SMARTIFY_OS_NO_MODIFY_PATH` | Leave your shell config alone |
| `SMARTIFY_OS_BASE_URL` | Download from a mirror instead of GitHub |

### Uninstall

```bash
rm -rf ~/.smartify-os
```

Then take the `export PATH` line back out of your shell config. It is the one marked `# added by the SmartifyOS installer`.

## Supported platforms

| System | Builds |
| --- | --- |
| macOS | Apple Silicon, Intel |
| Linux | x64, ARM64, and musl versions of both for Alpine |
| Windows | x64, ARM64 |

## Working on the CLI

You need [Bun](https://bun.sh). Everything else comes from `bun install`.

```bash
git clone https://github.com/Mauznemo/SmartifyOS-CLI.git
cd SmartifyOS-CLI
bun install
```

| Command | What it does |
| --- | --- |
| `bun run dev -- --help` | Run it from source |
| `bun test` | Run the tests |
| `bun run typecheck` | Typecheck with tsc |
| `bun run format` | Format and fix with Biome |
| `bun run build` | Build a binary for this machine, then run it |
| `bun run build:all` | Build all eight published targets |

`CLAUDE.md` has the conventions this codebase follows.

## Releasing

Bump the version in `package.json`, then push a matching tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

CI builds every target, ad-hoc signs the macOS ones on a real Mac, publishes them all to a GitHub Release with a `checksums.txt`, then installs that release on Linux, macOS, Windows and Alpine to prove the install scripts still work.

## Serving the install scripts from smartify-os.com

The install commands above point at `smartify-os.com`, which is the SvelteKit site in its own repo. Pick whichever of these fits that site's adapter.

### Copy the files, works with any adapter

Put `install.sh` and `install.ps1` in the site repo under `static/`. Everything in `static/` is served from the root as is, so they end up at `https://smartify-os.com/install.sh` and `https://smartify-os.com/install.ps1`.

For a `/cli` path instead, use `static/cli/install.sh` and adjust the command in this README.

The catch is that the copies can drift from this repo, so re-copy them whenever they change here.

### Proxy them, no drift, needs a server adapter

If the site is not on `adapter-static`, add `src/routes/install.sh/+server.ts` in the site repo instead. A route folder with a dot in its name is fine in SvelteKit.

```ts
import type { RequestHandler } from './$types';

const SOURCE = 'https://raw.githubusercontent.com/Mauznemo/SmartifyOS-CLI/main/install.sh';

export const GET: RequestHandler = async ({ fetch }) => {
	const res = await fetch(SOURCE);
	return new Response(await res.text(), {
		headers: {
			'content-type': 'text/x-shellscript; charset=utf-8',
			'cache-control': 'public, max-age=300',
		},
	});
};
```

Copy the same file to `src/routes/install.ps1/+server.ts` with the ps1 URL and `content-type: text/plain; charset=utf-8`.

This way the site always serves whatever is on `main` here, and there is only ever one copy to maintain.
