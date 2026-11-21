![allblue: Bun's built-in APIs in one TypeScript file](logo.svg)

![Bun 1.4.5](https://img.shields.io/badge/Bun-1.4.5-f6dcae?logo=bun&logoColor=white&labelColor=14151a)![TypeScript](https://img.shields.io/badge/TypeScript-one%20file-3178c6?logo=typescript&logoColor=white)![Dependencies: 0](https://img.shields.io/badge/dependencies-0-2f80ed)![Platforms: macOS, Linux, Windows](https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-555)![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)

**allblue** is a single TypeScript file, [`allblue.ts`](allblue.ts), that runs **small Bun servers**, one per port, and teaches Bun's built-in APIs from "hello world" to FFI. Every example uses only what ships with Bun 1.4.5: no `npm install`, no framework, no `node_modules`.

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

You need [Bun](https://bun.com) **1.4.5** or newer.

```bash
bun --version          # 1.4.5
bun allblue.ts             # start all 81 examples (ports 3001-3081)
bun test ./allblue.ts      # start them all and run the built-in self-test
```

Then open any example in a browser or with curl:

```bash
curl localhost:3017/api/users/1        # ★ HTTP server
open http://localhost:3049/            # ★ WebSockets chat (open two tabs)
curl localhost:3081/ffi                # ★ calling C from TypeScript
```

Press Ctrl+C to stop. Every server finishes its in-flight requests first, then the process exits with code 0.

Each example's header comment ends with a **Try:** block that lists the exact commands for that example. Search the file for `[17]`, `[49]`, and so on to jump straight to it.

## Choosing what to run

```bash
bun allblue.ts                     # everything
bun allblue.ts 17 49 50            # only these three
bun allblue.ts 20-25               # a range
bun allblue.ts beginner            # a level: beginner | intermediate | advanced
bun allblue.ts official            # the ten ★ official showcase examples
bun allblue.ts beginner 49 51-53   # mix them
bun --hot allblue.ts 80            # flags for bun go BEFORE the file name
```

- Examples always start in number order.
- Two examples call other examples over HTTP. Choosing them starts their dependencies too, and the console says so:
  - [54] needs 03, 16, 58 and 62.
  - [78] needs 39, 41, 42, 72 and 73.
- An unknown argument prints the usage and exits with code 2, without starting anything.
- `bun --hot` reloads the code in place when you save, without restarting the process. Try it with [65] or [80] and watch the browser update.

## New for Bun 1.4.5

Bun 1.4.5 is a security release with no new APIs. Four examples show what it changed, and each one sits in the level where it fits. The examples were renumbered so that every level is one continuous range: beginner 01-20, intermediate 21-56, advanced 57-81.

| # | Level | Shows |
|---|---|---|
| [20] | Beginner | `Bun.version`, `process.versions`, a `Bun.semver` version gate, and which SQLite is really in use |
| [32] | Intermediate | SQLite 3.54: `ALTER TABLE` refuses `rowid`/`oid`/`_rowid_`, plus a `node:sqlite` authorizer for user-written queries |
| [56] | Intermediate | RSA signatures in `node:crypto` with SHA-3, SHA-512/224, SHA-512/256 and RIPEMD-160 (PKCS#1 v1.5 and PSS) |
| [63] | Advanced | TLS error codes: `CERT_HAS_EXPIRED`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `ERR_TLS_CERT_ALTNAME_INVALID` |

On macOS, Bun links the system SQLite instead of the bundled 3.54.1. `allblue.ts` switches to Homebrew's SQLite with `Database.setCustomSQLite()` when it is installed (`brew install sqlite`), so the 3.54 rules are active there too. Set `BUN_SQLITE_LIB=system` to keep the system SQLite, or `BUN_SQLITE_LIB=/path/libsqlite3.dylib` to use another build.

## License

[Apache License 2.0](LICENSE).

The logo is original artwork made for this project. It is not the official Bun logo, and this project is not affiliated with Oven or the Bun project.
