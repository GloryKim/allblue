![allblue: Bun's built-in APIs in one TypeScript file](logo.svg)

![Bun 1.4.4](https://img.shields.io/badge/Bun-1.4.4-f6dcae?logo=bun&logoColor=white&labelColor=14151a)![TypeScript](https://img.shields.io/badge/TypeScript-one%20file-3178c6?logo=typescript&logoColor=white)![Dependencies: 0](https://img.shields.io/badge/dependencies-0-2f80ed)![Platforms: macOS, Linux, Windows](https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-555)![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)

**allblue** is a single TypeScript file, [`allblue.ts`](allblue.ts), that runs **small Bun servers**, one per port, and teaches Bun's built-in APIs from "hello world" to FFI. Every example uses only what ships with Bun 1.4.4: no `npm install`, no framework, no `node_modules`.

- **Read it top to bottom.** The examples go from beginner through intermediate to advanced. Every example is a self-contained `startNN()` function with long English comments that explain *how* the API works, not just how to call it.
- **Run any part of it.** Start everything, one example, a range, or a difficulty level.
- **It tests itself.** `bun test ./allblue.ts` starts every example and checks it with the `bun:test` suite built into the same file. The surprising Bun behaviours found along the way are listed at the top of `allblue.ts`.

## Platforms

`allblue.ts` runs wherever Bun runs:

| OS | CPU | Minimum |
|---|---|---|
| macOS | arm64 (Apple Silicon), x64 (Intel) | macOS 13 |
| Linux | x64, arm64 — glibc or musl (Alpine, Void) | glibc 2.17; kernel 5.6 recommended, 3.10 works |
| Windows | x64, arm64 | Windows 10 version 1809 |

x64 CPUs need SSE4.2 (Intel Nehalem, AMD Bulldozer or newer). Install Bun with:

```bash
curl -fsSL https://bun.com/install | bash         # macOS, Linux (Linux also needs unzip)
```

```powershell
powershell -c "irm bun.sh/install.ps1|iex"        # Windows
```

Homebrew (`brew install oven-sh/bun/bun`), npm (`npm install -g bun`), Scoop (`scoop install bun`) and Docker (`docker pull oven/bun`) work too.

The OS-specific parts of `allblue.ts` adapt by themselves: the unix socket path, the C library names in the FFI example, and Bun Shell builtins (`cat`, `echo`, `ls`) instead of external programs. Examples that need a program that may be missing (`gzip`, `git`) skip that step. It was developed on macOS (arm64); run `bun test ./allblue.ts` to check your machine.

## Quick start

You need [Bun](https://bun.com) **1.4.4** or newer.

```bash
bun --version          # 1.4.4
bun allblue.ts             # start all 77 examples (ports 3001-3077)
bun test ./allblue.ts      # start them all and run the built-in self-test
```

Then open any example in a browser or with curl:

```bash
curl localhost:3017/api/users/1        # ★ HTTP server
open http://localhost:3047/            # ★ WebSockets chat (open two tabs)
curl localhost:3077/ffi                # ★ calling C from TypeScript
```

Press Ctrl+C to stop. Every server finishes its in-flight requests first, then the process exits with code 0.

Each example's header comment ends with a **Try:** block that lists the exact commands for that example. Search the file for `[17]`, `[47]`, and so on to jump straight to it.

## Choosing what to run

```bash
bun allblue.ts                     # everything
bun allblue.ts 17 47 48            # only these three
bun allblue.ts 20-25               # a range
bun allblue.ts beginner            # a level: beginner | intermediate | advanced
bun allblue.ts official            # the ten ★ official showcase examples
bun allblue.ts beginner 47 49-51   # mix them
bun --hot allblue.ts 76            # flags for bun go BEFORE the file name
```

- Examples always start in number order.
- Two examples call other examples over HTTP. Choosing them starts their dependencies too, and the console says so:
  - [52] needs 03, 16, 55 and 59.
  - [74] needs 37, 39, 40, 68 and 69.
- An unknown argument prints the usage and exits with code 2, without starting anything.
- `bun --hot` reloads the code in place when you save, without restarting the process. Try it with [61] or [76] and watch the browser update.

## License

[Apache License 2.0](LICENSE).

The logo is original artwork made for this project. It is not the official Bun logo, and this project is not affiliated with Oven or the Bun project.
