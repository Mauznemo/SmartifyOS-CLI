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

| Variable                     | What it does                                                            |
| ---------------------------- | ----------------------------------------------------------------------- |
| `SMARTIFY_OS_VERSION`        | Install a specific release, for example `v0.1.0`, instead of the newest |
| `SMARTIFY_OS_INSTALL_DIR`    | Install somewhere other than `~/.smartify-os/bin`                       |
| `SMARTIFY_OS_NO_MODIFY_PATH` | Leave your shell config alone                                           |
| `SMARTIFY_OS_BASE_URL`       | Download from a mirror instead of GitHub                                |

### Uninstall

```bash
rm -rf ~/.smartify-os
```

Then take the `export PATH` line back out of your shell config. It is the one marked `# added by the SmartifyOS installer`.

## Supported platforms

| System  | Builds                                           |
| ------- | ------------------------------------------------ |
| macOS   | Apple Silicon, Intel                             |
| Linux   | x64, ARM64, and musl versions of both for Alpine |
| Windows | x64, ARM64                                       |

## Working on the CLI

You need [Bun](https://bun.sh). Everything else comes from `bun install`.

```bash
git clone https://github.com/Mauznemo/SmartifyOS-CLI.git
cd SmartifyOS-CLI
bun install
```

| Command                 | What it does                                 |
| ----------------------- | -------------------------------------------- |
| `bun run dev -- --help` | Run it from source                           |
| `bun test`              | Run the tests                                |
| `bun run typecheck`     | Typecheck with tsc                           |
| `bun run format`        | Format and fix with Biome                    |
| `bun run build`         | Build a binary for this machine, then run it |
| `bun run build:all`     | Build all eight published targets            |
