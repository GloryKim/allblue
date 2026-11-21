/* ============================================================================
 * allblue: Bun's built-in APIs, one TypeScript file
 * ============================================================================
 * What this file is
 *   One process that starts up to 81 small Bun servers, one per port
 *   (example NN listens on port 30NN; [58] uses a unix socket). Every
 *   example lives in its own `async function startNN()`, so names like
 *   `server` or `WsData` cannot clash, and uses only what ships with Bun:
 *   no npm packages, no framework.
 *
 * How to read it
 *   Top to bottom: shared helpers first, then the examples from BEGINNER
 *   [01]-[20] through INTERMEDIATE [21]-[56] to ADVANCED [57]-[81], then the runner
 *   and the self-test. Search for "[NN]" to jump to an example; each header
 *   comment ends with a "Try:" block of curl commands. The English comments
 *   explain how each API works; the original Korean comments were kept.
 *   Code corrected after review is marked "FIXED" or "UPDATED".
 *
 * Levels
 *   Beginner      01 hello, 02 HTML, 03 JSON + routes, 04 path params,
 *                 05 per-method handlers, 06 query, 07 request body,
 *                 08 static file, 09 cookies, 10 static Response / redirect,
 *                 11 error handler, 12 data formats, 13 hashing & ids,
 *                 14 file API, 15 markdown & escaping, 16 compression,
 *                 17 ★ HTTP server, 18 ★ passwords, 19 stdlib utilities,
 *                 20 ◆ runtime & library versions
 *   Intermediate  21 WebSocket echo, 22 CORS, 23 upload, 24 SSE,
 *                 25 bearer auth, 26 middleware, 27 static directory,
 *                 28 streaming, 29 ws pub/sub, 30 REST CRUD, 31 bun:sqlite,
 *                 32 ◆ SQLite 3.54 rules + authorizer, 33 metrics,
 *                 34 rate limit, 35 graceful stop, 36 Range, 37 session,
 *                 38 validation 422, 39 paging + If-Match, 40 ETag / 304,
 *                 41 NDJSON, 42 slow & flaky, 43 CSRF, 44 HTMLRewriter,
 *                 45 Bun.cron, 46 shell & spawn, 47 ★ bun test,
 *                 48 toolchain, 49 ★ WebSockets, 50 ★ Bun.sql,
 *                 51 ★ Bun.redis, 52 ★ Bun.s3, 53 ★ Bun Shell,
 *                 54 fetch extras, 55 Bun.secrets, 56 ◆ RSA signatures
 *   Advanced      57 server.reload, 58 unix socket, 59 reverse proxy,
 *                 60 timeouts, 61 route priority, 62 TLS,
 *                 63 ◆ TLS certificate errors, 64 HTTP/3, 65 HTML import,
 *                 66 ws backpressure, 67 JWT, 68 mini framework,
 *                 69 integration, 70 hardening, 71 ws.publish vs
 *                 server.publish, 72 background jobs, 73 WebSocket RPC,
 *                 74 image service, 75 file vault, 76 workers, 77 TCP/UDP,
 *                 78 client patterns, 79 spawn IPC, 80 ★ frontend, 81 ★ FFI
 *
 * ◆ Added for Bun 1.4.5, a security release with no new APIs: what it
 *   changed is shown live in [20] versions, [32] SQLite 3.54,
 *   [56] RSA + SHA-3 signatures and [63] TLS error codes. The numbers
 *   were reassigned so that every level stays in one continuous range.
 *
 * ★ The ten official bun.com showcase samples, each with a full version
 *   HTTP server [17], Passwords [18], Testing [47], WebSockets [49],
 *   PostgreSQL [50], Redis [51], S3 [52], Shell [53], Frontend [80], FFI [81]
 *
 * The bun toolchain (explained and run live in [47] and [48])
 *   bun run     run TS/JS directly, package.json scripts, --watch, --hot
 *   bun install npm-compatible installs, text lockfile bun.lock
 *   bun test    Jest-compatible test runner
 *   bun build   bundler for browser/server, --compile for executables
 *   bun check   type checker reporting the same errors as tsc
 *   bun fmt     Prettier-compatible formatter, --check for CI
 *
 * Run
 *   bun allblue.ts                    start everything (Ctrl+C stops all gracefully)
 *   bun allblue.ts 01 05 12           start only these (also: 20-25, beginner,
 *                                 intermediate, advanced, official; see RUNNER)
 *   bun --hot allblue.ts              reload code in place on save
 *   bun test ./allblue.ts             start everything and test every example
 *   bun build --compile ./allblue.ts --outfile allblue
 *                                 one executable that contains Bun itself
 *
 * Platforms
 *   Wherever Bun runs: macOS 13+ (arm64, x64), Linux (x64, arm64; glibc 2.17+
 *   or musl), Windows 10 1809+ (x64, arm64). OS-specific parts adapt:
 *   the unix socket path, the C library names in [81], and Bun Shell builtins
 *   (cat, echo, ls) instead of external programs. External programs that
 *   may be missing (gzip, git) are skipped. Run `bun test ./allblue.ts` to check
 *   your machine.
 *
 * Optional services (opt-in, so nothing real is touched by default)
 *   BUN_DEMO_PG_URL=postgres://...  [50] uses PostgreSQL, else in-memory SQLite
 *   BUN_DEMO_REDIS_URL=redis://...  [51] uses Redis, else an in-process RESP3 toy
 *   BUN_DEMO_S3=1 + S3_* variables  [52] reads/writes a bucket, else presign only
 *   BUN_DEMO_SECRETS=1              [55] uses the OS keychain, else disabled
 *
 * Files created at run time (next to allblue.ts, or in the current directory
 * when compiled; delete them any time, they come back)
 *   _static/ _public/ _uploads/ _data/ _vault/ _certs/ _html_import/ _frontend/
 *   Outside: the OS temp folder (bun-all-ts-*) and the unix socket file.
 *
 * Facts verified on Bun 1.4.5 while writing these notes
 *   (first found on 1.4.4; the self-test re-checks every one on 1.4.5)
 *   - On macOS, bun:sqlite and node:sqlite use the SYSTEM SQLite (3.51.0 on
 *     the development Mac), not the bundled 3.54.1. Database.setCustomSQLite()
 *     switches BOTH to another libsqlite3; allblue.ts uses Homebrew's
 *     (3.54.1) when installed, see SQLITE_LIB ([20], [32]).
 *   - An expired certificate reports CERT_HAS_EXPIRED in fetch() and in
 *     node:tls, even when it is also untrusted or trusted via `ca` ([63]).
 *   - Bun.serve `development` defaults to TRUE unless NODE_ENV=production.
 *     Without an `error()` handler, a thrown error then returns Bun's HTML
 *     error page, which contains the error message, stack and source code.
 *   - A method missing from a { GET, POST } route object is NOT answered 405:
 *     the request falls through to `fetch` (or a default 404) ([05]).
 *   - `await req.json()` THROWS on invalid JSON. Without try/catch the
 *     request ends as a 500 ([05], [30]).
 *   - `new Response(Bun.file(path))` answers HEAD and `Range: bytes=a-b`
 *     (206) automatically and sets Content-Length, but adds no ETag ([36]).
 *   - A handler that awaits longer than idleTimeout MAY be reset
 *     (ECONNRESET), depending on timing; server.timeout(req, 0) is reliable ([60]).
 *   - A closed WebSocket is removed from all its topics automatically ([71]).
 *   - Bun.markdown.html() keeps raw HTML unless you pass { tagFilter: true,
 *     noHtmlBlocks: true, noHtmlSpans: true }, and keeps javascript: links ([15]).
 *   - Bun Shell does not accept an input AND an output redirect on one
 *     command: `gzip -9 < ${res} > out.gz` (the bun.com Shell sample) throws
 *     a parse error; `gzip -9 < ${res} | cat > out.gz` works ([53]).
 *   - $`...`.env({ A: "1" }) REPLACES the environment ($HOME is then empty);
 *     spread process.env in to add a variable ([53]).
 *   - bcrypt reads only the first 72 bytes of a password, also in Bun;
 *     argon2id (the default) has no such limit ([18]).
 *   - Bun.sql(obj, "a", "b") inserts only the listed columns ([50]).
 *   - In a compiled binary, import.meta.dir is read-only (/$bunfs/root) and
 *     process.execPath is the binary itself (see BASE_DIR, BUN_CHILD_ENV).
 * ==========================================================================*/

// ############################################################################
// ############################################################################
//
//   SHARED HELPERS
//
// ############################################################################
// ############################################################################

import type { Serve, Server } from "bun";
import { Database } from "bun:sqlite";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
// The built-in "bun" module: text-format parsers, Bun Shell, and the clients
// behind Bun.sql, Bun.redis, Bun.s3 and Bun.secrets (all lazy: importing
// them connects nowhere).
import { $, JSON5, JSONC, JSONL, RedisClient, S3Client, SQL, TOML, XML, YAML, secrets } from "bun";
// bun:ffi is built in too (no npm package).
import { cc, dlopen, FFIType, ptr, suffix } from "bun:ffi";
// UPDATED: the two local imports below were removed so that allblue.ts needs
// no sibling files. `homepage` is now loaded inside start65() and `mini`
// comes from the inlined MiniFramework namespace just above [68].
// import homepage from "./_html_import/index.html";
// import { mini } from "./_mini/mini.ts";

// Writes `content` to `path` only when the file does not exist yet.
// Bun.write() creates missing parent folders by itself, so a fresh copy of
// allblue.ts in an empty folder builds _certs/ and _html_import/ on first run,
// while a file you already edited (or a cert you regenerated) is never
// overwritten. Bun.file().exists() is a cheap stat() call.
// UPDATED (compile): `bun build --compile allblue.ts` turns this file into one
// executable. Inside it, import.meta.dir is a virtual, READ-ONLY folder
// ("/$bunfs/root" on macOS/Linux, a "~BUN" path on Windows), so writing
// _data/, _uploads/ ... there fails with EROFS. BASE_DIR is where every
// example keeps its files: next to allblue.ts when run with `bun allblue.ts`, and the
// current working directory when run as a compiled binary.
const COMPILED = import.meta.dir.startsWith("/$bunfs") || import.meta.dir.includes("~BUN");
const BASE_DIR = COMPILED ? process.cwd() : import.meta.dir;
// UPDATED (compile): examples that start Bun as a child process use
// process.execPath. In a compiled binary that is the binary ITSELF, which
// would start a second copy of allblue.ts. BUN_BE_BUN=1 makes a compiled binary
// behave like the plain `bun` CLI instead; with normal bun it changes nothing.
const BUN_CHILD_ENV = { ...process.env, BUN_BE_BUN: "1" };

async function writeIfMissing(path: string, content: string) {
  if (!(await Bun.file(path).exists())) await Bun.write(path, content);
}

// FIXED type: since Bun 1.3 `Server` is generic (Server<WebSocketData>).
// Server<any> accepts servers with any ws.data type.
const servers: { id: string; server: Server<any> }[] = [];
const push = (id: string, server: Server<any>) => {
  servers.push({ id, server });
  return server;
};

// The unix socket path for the unix-socket example and the fetch-extras
// example. /tmp is short and always writable on macOS and Linux (a socket
// path must stay under ~104 bytes); Windows has no /tmp, so it uses the
// user's temp folder there.
const UNIX_SOCK = process.platform === "win32" ? `${tmpdir()}\\allblue.sock` : "/tmp/allblue.sock";

// UPDATED (SQLite 3.54): Bun bundles SQLite 3.54.1 on Linux and Windows, but
// on macOS it links the SYSTEM libsqlite3, which is older and cannot be
// upgraded. Database.setCustomSQLite(path) points bun:sqlite AND node:sqlite
// at another libsqlite3 instead; it must run before the first database is
// opened, which is why it sits here, at the top. On macOS the Homebrew
// build is used when it is installed (`brew install sqlite`, keg-only, so
// it does not replace the system one):
//   BUN_SQLITE_LIB=/path/libsqlite3.dylib   use this library
//   BUN_SQLITE_LIB=system                   keep the macOS system SQLite
// [20] and [32] show which SQLite ended up in use.
const SQLITE_LIB = (() => {
  const wanted = Bun.env.BUN_SQLITE_LIB;
  if (wanted === "system") return null;
  if (wanted) return wanted;
  if (process.platform !== "darwin") return null; // bundled 3.54.1 already
  // Apple Silicon, then Intel Homebrew prefixes.
  return ["/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib", "/usr/local/opt/sqlite/lib/libsqlite3.dylib"].find((p) => existsSync(p)) ?? null;
})();
let SQLITE_SOURCE = process.platform === "darwin" ? "system libsqlite3 (macOS)" : "bundled with Bun";
if (SQLITE_LIB) {
  try {
    Database.setCustomSQLite(SQLITE_LIB);
    SQLITE_SOURCE = `custom: ${SQLITE_LIB}`;
  } catch (err) {
    console.warn(`custom SQLite ${SQLITE_LIB} not loaded, using ${SQLITE_SOURCE}: ${(err as Error).message}`);
  }
}


// ----------------------------------------------------------------------------
// Request and response helpers
// ----------------------------------------------------------------------------

/**
 * push() above is declared with `Server`, which since Bun 1.3 is a generic
 * type (`Server<WebSocketData>`). Rather than change that original line, the
 * new examples register through this adapter. It also accepts non-HTTP
 * listeners ([77]) as long as they have a `url` and a `stop()`.
 */
function register(id: string, server: { readonly url: URL; stop(closeActiveConnections?: boolean): unknown }) {
  push(id, server as unknown as Parameters<typeof push>[1]);
}

/**
 * An Error that carries an HTTP status and optional machine-readable
 * details. Handlers `throw new HttpError(422, ...)`; the server's `error()`
 * callback turns it into a JSON response with errorResponse(). This keeps
 * handlers short: no `if (bad) return Response.json(...)` chains.
 */
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Turn anything thrown into a JSON response. Unknown errors never leak details. */
function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json(err.details === undefined ? { error: err.message } : { error: err.message, details: err.details }, { status: err.status });
  }
  console.error("[extended] unhandled:", err);
  return Response.json({ error: "Internal Server Error" }, { status: 500 });
}

/**
 * Read a JSON body safely:
 *   415 if Content-Type is not JSON (so a form post is not misread),
 *   413 if bigger than `limit` (checked while the bytes ARRIVE: the body
 *       stream is read chunk by chunk and abandoned as soon as it is too big,
 *       so a 1 GB body costs `limit` bytes of memory, not 1 GB),
 *   400 if it is not valid JSON.
 * Compare with `await req.json()` in [05]/[30], which does none of this.
 */
async function readJsonCapped(req: Request, limit = 64 * 1024): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    throw new HttpError(415, "send Content-Type: application/json");
  }
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new HttpError(413, `body is larger than ${limit} bytes`);
  if (!req.body) throw new HttpError(400, "request has no body");
  const sink = new Bun.ArrayBufferSink(); // a growable native byte buffer
  sink.start({ asUint8Array: true });
  let total = 0;
  for await (const chunk of req.body) {
    total += chunk.byteLength;
    if (total > limit) throw new HttpError(413, `body is larger than ${limit} bytes`);
    sink.write(chunk);
  }
  try {
    return JSON.parse(new TextDecoder().decode(sink.end() as Uint8Array));
  } catch {
    throw new HttpError(400, "body is not valid JSON");
  }
}

/** SHA-256 as hex. Bun.CryptoHasher is native (BoringSSL) and incremental. */
const sha256hex = (data: string | Uint8Array) => new Bun.CryptoHasher("sha256").update(data).digest("hex");

/** Read a query parameter. */
const qp = (req: Request, name: string) => new URL(req.url).searchParams.get(name);


// ----------------------------------------------------------------------------
// Process and toolchain helpers
// ----------------------------------------------------------------------------

/**
 * Run the bun binary that is running this file (process.execPath), so the
 * child uses exactly the same Bun version. Returns exit code and output.
 *   - stdin: a string is piped in through a Response (Bun.spawn accepts
 *     Response, Blob, Request, a file or "pipe" as stdin);
 *   - timeout: Bun.spawn kills the child after this many ms (exited then
 *     resolves with the signal's code), so a hung tool cannot hang a request;
 *   - NO_COLOR=1: tools print plain text instead of ANSI colour codes.
 */
async function runBun(args: string[], opts: { cwd: string; stdin?: string; timeoutMs?: number }) {
  const proc = Bun.spawn([process.execPath, ...args], {
    cwd: opts.cwd,
    stdin: opts.stdin === undefined ? "ignore" : new Response(opts.stdin),
    stdout: "pipe",
    stderr: "pipe",
    timeout: opts.timeoutMs ?? 30_000,
    env: { ...BUN_CHILD_ENV, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr };
}

/** Keep only the last `n` non-empty lines of tool output for a JSON answer. */
const tail = (text: string, n = 12) => text.split("\n").filter((l) => l.trim() !== "").slice(-n);

/**
 * A throwaway project for [47] (bun test) and [48] (the other tools).
 * It lives in the OS temp folder on purpose: if it were inside this folder,
 * a plain `bun test` here would discover its *.test.ts files, including
 * the one that fails on purpose. The files are rewritten on every start so
 * the demo always begins from the same state.
 */
const TOOLCHAIN_DIR = `${tmpdir()}/bun-all-ts-toolchain`;
async function ensureToolchainProject() {
  const files: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: "toolchain-demo",
        private: true,
        type: "module",
        scripts: {
          hello: "bun ./src/hello.ts",
          greet: "echo hello from $npm_package_name",
          build: "bun build ./src/hello.ts --outdir dist --target bun --minify",
        },
      },
      null,
      2,
    ),
    "src/math.ts": [
      "export const add = (a: number, b: number) => a + b;",
      "export function divide(a: number, b: number) {",
      '  if (b === 0) throw new Error("division by zero");',
      "  return a / b;",
      "}",
      "export function greet(name: string, now = new Date()) {",
      '  return (now.getUTCHours() < 12 ? "good morning, " : "good afternoon, ") + name;',
      "}",
      "type FetchLike = (url: string) => Promise<Response>;",
      "export async function loadUser(id: number, fetchFn: FetchLike = fetch) {",
      '  const res = await fetchFn("https://api.example.com/users/" + id);',
      "  return (await res.json()) as { id: number; name: string };",
      "}",
      "",
    ].join("\n"),
    "src/hello.ts": ['import { add } from "./math.ts";', 'console.log("hello from bun run, 2 + 3 =", add(2, 3));', ""].join("\n"),
    "src/math.test.ts": [
      'import { afterEach, describe, expect, mock, setSystemTime, spyOn, test } from "bun:test";',
      'import { add, divide, greet, loadUser } from "./math.ts";',
      "",
      'describe("add", () => {',
      '  test("adds", () => {',
      "    expect(add(2, 2)).toBe(4);",
      "  });",
      "  test.each([",
      "    [1, 2, 3],",
      "    [-1, 1, 0],",
      "    [0.1, 0.2, 0.30000000000000004],",
      '  ])("add(%p, %p) = %p", (a, b, sum) => {',
      "    expect(add(a, b)).toBe(sum);",
      "  });",
      "});",
      "",
      'describe("divide", () => {',
      '  test("throws on zero", () => {',
      '    expect(() => divide(1, 0)).toThrow("division by zero");',
      "  });",
      '  test("compares floats with toBeCloseTo", () => {',
      "    expect(divide(1, 3)).toBeCloseTo(0.333, 3);",
      "  });",
      "});",
      "",
      'describe("mocks and time", () => {',
      "  afterEach(() => setSystemTime()); // back to the real clock",
      '  test("mock() records every call", async () => {',
      '    const fakeFetch = mock(async (url: string) => Response.json({ id: 1, name: "Alice", url }));',
      "    const user = await loadUser(1, fakeFetch);",
      '    expect(user.name).toBe("Alice");',
      "    expect(fakeFetch).toHaveBeenCalledTimes(1);",
      '    expect(fakeFetch).toHaveBeenCalledWith("https://api.example.com/users/1");',
      "  });",
      '  test("spyOn() replaces a real method and restores it", () => {',
      '    const spy = spyOn(Math, "random").mockReturnValue(0.5);',
      "    expect(Math.random()).toBe(0.5);",
      "    spy.mockRestore();",
      "  });",
      '  test("setSystemTime() freezes Date", () => {',
      '    setSystemTime(new Date("2026-01-01T09:00:00Z"));',
      '    expect(greet("ada")).toBe("good morning, ada");',
      "  });",
      "});",
      "",
      'test.concurrent("concurrent A", async () => {',
      "  await Bun.sleep(20);",
      "  expect(true).toBe(true);",
      "});",
      'test.concurrent("concurrent B", async () => {',
      "  await Bun.sleep(20);",
      "  expect([1, 2]).toEqual([1, 2]);",
      "});",
      'test("toEqual vs toMatchObject", () => {',
      "  expect({ a: 1, b: [2] }).toEqual({ a: 1, b: [2] });",
      "  expect({ a: 1, extra: true }).toMatchObject({ a: 1 });",
      "});",
      'test.todo("a test you plan to write");',
      "",
    ].join("\n"),
    "src/failing.test.ts": [
      'import { expect, test } from "bun:test";',
      'test("this one fails on purpose", () => {',
      '  expect({ status: 200, body: "ok" }).toEqual({ status: 201, body: "ok" });',
      "});",
      "",
    ].join("\n"),
    "src/good.ts": "export const total: number = [1, 2, 3].reduce((a, b) => a + b, 0);\n",
    "src/bad.ts": 'const count: number = "three";\nexport { count };\n',
    "src/ugly.ts": "const   point = {x:1,\n      y:2}\nexport   {point}\n",
  };
  for (const [name, text] of Object.entries(files)) await Bun.write(`${TOOLCHAIN_DIR}/${name}`, text);
}

/** "3 pass", "1 fail", "1 todo" from bun test's summary. */
function testSummary(output: string) {
  const n = (word: string) => Number(new RegExp(`^\\s*(\\d+) ${word}$`, "m").exec(output)?.[1] ?? 0);
  return { pass: n("pass"), fail: n("fail"), todo: n("todo") };
}

// UPDATED: embedded development certificate for [62] and [64].
// It is a self-signed cert for CN=localhost (SAN localhost, 127.0.0.1),
// valid until 2027-11-17. Its private key is public on purpose: it is a
// throwaway for local testing, NEVER use it for a real host. ensureDevCert()
// writes it to _certs/ only if the files are missing, so if you regenerate
// the pair with the openssl command shown in [62], yours are used instead.
// (Bun has no built-in X.509 generator, which is why it is embedded and
// not created at run time.)
const DEV_TLS_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCy071/bSju8xMX
CNEwhrtyPGuxwNnhsWDx+J0vdWjZLOO0o79a85NBlOlXT7lOMEyHQNQhxj985RjC
9qH+K4j+FoBBqeZ3mC6upe7PHzuMfxZ7fkZ57aTS6TXJohy/J7bj/dV62SD3gFsr
J1qmDafHTW1B2Br6X+7IWQhfEphqWJu2lpK1peieVK38oH9y4Kk9jCzFqxJt/5Pg
i6TRDsJPOYm8U99aIcEkPuWo/BHG6gexIhjLHGdPFuh74mX9ydBhSUR80fl5R/rT
vrlhwNE9Agsa69wQ6f2gQD4SqR+TjMljzBhFwSVKBRkS6intnnGNA/kAnze4X59o
NrNdRjw9AgMBAAECggEAHIE45wtw52nSpKzQn4ISdfqglgRuFpYuJFPjRlHaRSft
IfmqAmbqFZ2Vdkfse0SipjqUtc+ChjeEc2tZ1gh9fTb7+buJ041r/4XOo7BQTyxg
2o190Wiqib4Hx1yyZVwAwKXQ9hSPNzR8E8xhnC94C4JRhJncbwWEq+XZOkJeDjFO
JuBPuOTcFT+uPOCEDYssOh98j6XqCYdKBLLYSlTOfsNSmpgcIBx0HaNIo/WYkSGM
qUlSYXy7pDor/5asPi1TaLWiZscyl2GK5DyBurSaoi4zfHW3qRmEg+ecvddYoETG
vqGqCZHnmyVroyGzj+ob8i6i6wDCpesm7DFi9N1p9wKBgQDpDVoDFou6VrgvDidt
SLORGzJ3fw8wKRggXQDlnRVdn5ZuruAzPZVdOtd7jYjuehhqdUNdx4Q36BTT8YkA
oEtnriBM2xCdCCLTe5kC6oO2SY0pUdRDr3o4aKV2y9KeEtSzC5oz9nNrGD/nYSfq
+gwR6yvO+OnLVZTA40BALkLfdwKBgQDEb4OWtf0a7gL3m+gYpSQLhMj45XTK5Fr+
uCvsAfF1Kh8lJqadURyHJht59N8u8nBB90p6frJXizt3orQrbMV/jPd2fQTHoOQ0
46MMcHFB8e3Tiy98RuR22XmCGRI3EEbL7DAP4Bj/re2olUMw1VCtSLPU9GsRrFn/
05tFu0A26wKBgB2RhxkbNDE5LXcy6YexEK9ZbwbARTIMFLaOdj2rt3lAdTqnz2RQ
7PF+NLbFV1lCfnSLWje8x6a8OGBHpeVBcS+/ZPO7W5lA3gJNDTXUgU+Qd2uFqVPJ
IM2lYVD4PUm3A+uPjkoHe89brUfzCLiEbyGa390LscYNnqj2bEF4XR2zAoGAEoeK
XB8SnwWwlfbI7/oz6jo+UuwiFjlwM/LfgcW1Jx4wDesVcGWEUWNQ2DI3E1CfMjnH
dsKYxBVIKMLaR/ZcsulzNmQYnVQZ8rs+WCALLvNJQdkxQ4HUbzmYcqM2yqboZrgC
2JyE/ylC79IUonicwZvICuB7cRFW9ADb9rnxFr0CgYB/Ljfz21ysTe8NAYbdysAF
8Ry6EE0dfoFeY5vK3zH5yzl6ki3IRxvrJ/MLovz9Gb3SwQ9NMY1oOL+BX/sqbz/s
+44j6PNiDxKkXspFT78zLrHil2A4gRQKr0hGENm0w/3EmAd850S9DqPBp03fs2+C
YV+sSmx1MlybXeqb/RdK+A==
-----END PRIVATE KEY-----
`;
const DEV_TLS_CERT = `-----BEGIN CERTIFICATE-----
MIIDJTCCAg2gAwIBAgIUR71oiAgPzmRdlZfRGD6FTxxxXvswDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI2MTExNzE4MTAwMVoXDTI3MTEx
NzE4MTAwMVowFDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAstO9f20o7vMTFwjRMIa7cjxrscDZ4bFg8fidL3Vo2Szj
tKO/WvOTQZTpV0+5TjBMh0DUIcY/fOUYwvah/iuI/haAQanmd5gurqXuzx87jH8W
e35Gee2k0uk1yaIcvye24/3Vetkg94BbKydapg2nx01tQdga+l/uyFkIXxKYalib
tpaStaXonlSt/KB/cuCpPYwsxasSbf+T4Iuk0Q7CTzmJvFPfWiHBJD7lqPwRxuoH
sSIYyxxnTxboe+Jl/cnQYUlEfNH5eUf60765YcDRPQILGuvcEOn9oEA+Eqkfk4zJ
Y8wYRcElSgUZEuop7Z5xjQP5AJ83uF+faDazXUY8PQIDAQABo28wbTAdBgNVHQ4E
FgQUuod3Da40T45eA/RG9Y7/05hkAfwwHwYDVR0jBBgwFoAUuod3Da40T45eA/RG
9Y7/05hkAfwwDwYDVR0TAQH/BAUwAwEB/zAaBgNVHREEEzARgglsb2NhbGhvc3SH
BH8AAAEwDQYJKoZIhvcNAQELBQADggEBABQM+TyI3hgdAHJzdlzOSzc2rfDwei6t
V9tlun23DVxw9Gaj/1nKY0AvUR19PTUYSK+jOV2ZDnLQkZmgL9LCpfP60qLT4b2Z
SwQfCo7EGIhTTaZoQpTliixMV2snjHWJdW204zyIK32V9S4VKX7FuPYTg3u1RYkn
OO+3l14cqrW3ss0yMGGuEtNuUvVSe0L/AcFfKWePyozuOK6ossqRCel9/hdePfSp
DjLMcWZMmUNXcIew5dkGwpaBlcoss/KPfJd1y18W4Xp+uKL/3GBF/yPS7FnP9tGD
+2PCrlsIZVke4aYNYRa8P3ZVhKJgy1t8trh96OevZ5+CMW/fcQBp0QM=
-----END CERTIFICATE-----
`;
async function ensureDevCert(dir: string) {
  await writeIfMissing(`${dir}/key.pem`, DEV_TLS_KEY);
  await writeIfMissing(`${dir}/cert.pem`, DEV_TLS_CERT);
}

// ========== MiniFramework (was _mini/mini.ts) ==========
// UPDATED: inlined from _mini/mini.ts so allblue.ts needs no sibling files.
// The code is unchanged; it is wrapped in a TypeScript `namespace` so its
// top-level names (Handler, Next, Route, match, ...) cannot clash with the
// rest of this file. Bun compiles a namespace into a plain object built by
// an IIFE; `export` inside it means "property of that object". It must be
// defined before the example runs, and it is: the examples are started at the
// very end of the file, after every top-level statement above it has executed.
namespace MiniFramework {
  // _mini/mini.ts — Express식 초소형 라우터 (의존성 0)
  // 고급 예제 [68]에서 사용. 학습용 축소판.

  export type Next = (err?: unknown) => void;
  export type Handler = (
    req: MiniReq,
    res: MiniRes,
    next: Next,
  ) => unknown | Promise<unknown>;

  type Route = { method: string; pattern: string; handlers: Handler[] };

  export class MiniReq {
    raw: Request;
    method: string;
    url: URL;
    params: Record<string, string> = {};
    body: unknown;
    constructor(raw: Request) {
      this.raw = raw;
      this.method = raw.method;
      this.url = new URL(raw.url);
    }
    get path() {
      return this.url.pathname;
    }
    get query() {
      return this.url.searchParams;
    }
  }

  export class MiniRes {
    statusCode = 200;
    headers = new Headers();
    finished = false;
    // FIXED type: BodyInit is a DOM-lib type; this derives the same type from Response.
    private _body: ConstructorParameters<typeof Response>[0] = null;

    status(code: number) {
      this.statusCode = code;
      return this;
    }
    json(data: unknown) {
      this.headers.set("Content-Type", "application/json; charset=utf-8");
      this._body = JSON.stringify(data);
      return this.end();
    }
    send(text: string) {
      if (!this.headers.has("Content-Type")) {
        this.headers.set("Content-Type", "text/plain; charset=utf-8");
      }
      this._body = text;
      return this.end();
    }
    end() {
      this.finished = true;
      return this;
    }
    toResponse() {
      return new Response(this._body, {
        status: this.statusCode,
        headers: this.headers,
      });
    }
  }

  function match(pattern: string, path: string): Record<string, string> | null {
    const pp = pattern.split("/").filter(Boolean);
    const sp = path.split("/").filter(Boolean);
    if (pp.length !== sp.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < pp.length; i++) {
      const a = pp[i]!;
      const b = sp[i]!;
      if (a.startsWith(":")) params[a.slice(1)] = decodeURIComponent(b);
      else if (a !== b) return null;
    }
    return params;
  }

  export function mini() {
    const routes: Route[] = [];
    const middlewares: Handler[] = [];

    const add =
      (method: string) =>
      (pattern: string, ...handlers: Handler[]) => {
        routes.push({ method, pattern, handlers });
        return api;
      };

    const api = {
      use(mw: Handler) {
        middlewares.push(mw);
        return api;
      },
      get: add("GET"),
      post: add("POST"),
      put: add("PUT"),
      patch: add("PATCH"),
      delete: add("DELETE"),
      listen(port: number) {
        return Bun.serve({
          port,
          async fetch(raw) {
            const req = new MiniReq(raw);
            const res = new MiniRes();

            const stack: Handler[] = [...middlewares];
            const found = routes.find(
              (r) =>
                r.method === req.method &&
                match(r.pattern, req.path) !== null,
            );
            if (found) {
              req.params = match(found.pattern, req.path)!;
              stack.push(...found.handlers);
            } else {
              stack.push((_q, r) => {
                r.status(404).send("Not Found");
              });
            }

            let i = 0;
            const next: Next = async (err) => {
              if (err) {
                console.error(err);
                if (!res.finished) res.status(500).json({ error: "Internal" });
                return;
              }
              const h = stack[i++];
              if (!h || res.finished) return;
              try {
                await h(req, res, next);
              } catch (e) {
                await next(e);
              }
            };
            await next();
            return res.toResponse();
          },
        });
      },
    };

    return api;
  }
}
const { mini } = MiniFramework;


// ############################################################################
// ############################################################################
//
//   BEGINNER  [01]-[20]  (20 examples)
//
// ############################################################################
// ############################################################################

// ========== [01] 01_hello.ts ==========
// ★ IMPORTANT — first step towards the official bun.com sample "HTTP server"; full version: [17].
// Level: Beginner. The smallest possible server.
// Bun.serve() starts an HTTP server and returns a Server object at once
// (no callback, no .listen()). `fetch` is called for EVERY request and must
// return a Response (or a Promise of one). server.url is the real address,
// which matters when you pass port: 0 and let the OS choose.
async function start01() {
  // 01. Hello World — 최소 Bun.serve
  // 확인: curl http://localhost:3001/

  const server = Bun.serve({
    port: 3001,
    // `fetch(req, server)` receives the Request; it is unused here, so every
    // path and method gets the same answer. Try: curl -X DELETE localhost:3001/x
    fetch() {
      return new Response("Hello, Bun.serve!");
    },
  });

  console.log(`01 hello → ${server.url}`);
    push("01", server);

}


// ========== [02] 02_html.ts ==========
// Level: Beginner. Returning HTML.
// A string body is sent as text/plain;charset=utf-8 by default. Browsers
// only render it as a page when Content-Type says text/html, so the header
// below is what turns text into a web page. The template string is built
// once, at startup, not per request.
async function start02() {
  // 02. HTML 응답
  // 실행: bun --hot 02_html.ts
  // 확인: 브라우저에서 http://localhost:3002/

  const html = `<!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bun.serve HTML</title>
    <style>
      body {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: #0f1115;
        color: #e8eaed;
      }
      h1 { font-weight: 600; letter-spacing: -0.03em; }
      p { color: #9aa0a6; margin-top: 0.5rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Hello HTML</h1>
      <p>Content-Type: text/html</p>
    </main>
  </body>
  </html>`;

  const server = Bun.serve({
    port: 3002,
    fetch() {
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });

  console.log(`02 html → ${server.url}`);
    push("02", server);

}


// ========== [03] 03_json.ts ==========
// Level: Beginner. JSON responses and the routes table.
// Response.json(data, init) = JSON.stringify(data) + Content-Type:
// application/json. `routes` is matched in native code first; `fetch` is
// only the fallback for paths that no route matched (here: a JSON 404).
async function start03() {
  // 03. JSON 응답 — Response.json
  // 실행: bun --hot 03_json.ts
  // 확인: curl http://localhost:3003/api/status

  const server = Bun.serve({
    port: 3003,
    routes: {
      "/": () =>
        Response.json({
          message: "Bun.serve JSON 예제",
          tip: "GET /api/status",
        }),
      "/api/status": () =>
        Response.json({
          ok: true,
          runtime: "bun",
          time: new Date().toISOString(),
        }),
    },
    fetch() {
      return Response.json({ error: "Not Found" }, { status: 404 });
    },
  });

  console.log(`03 json → ${server.url}`);
    push("03", server);

}


// ========== [04] 04_routes.ts ==========
// Level: Beginner. Path parameters.
// "/users/:id" matches /users/42 and puts "42" in req.params.id. TypeScript
// knows the param names from the route string itself. Params are always
// STRINGS and already URL-decoded: validate and convert them (Number(),
// a regex) before using them as numbers or in file paths.
async function start04() {
  // 04. routes — 다중 경로 + 경로 파라미터 (:id)
  // 실행: bun --hot 04_routes.ts
  // 확인:
  //   curl http://localhost:3004/
  //   curl http://localhost:3004/users/42
  //   curl http://localhost:3004/orgs/acme/repos/api

  const server = Bun.serve({
    port: 3004,
    routes: {
      "/": () => new Response("홈"),
      "/about": () => new Response("소개 페이지"),
      "/users/:id": (req) => {
        // :id 자리에 들어온 값. 숫자처럼 보여도 문자열이다
        const { id } = req.params;
        return Response.json({ userId: id });
      },
      "/orgs/:orgId/repos/:repoId": (req) => {
        const { orgId, repoId } = req.params;
        return Response.json({ orgId, repoId });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`04 routes → ${server.url}`);
    push("04", server);

}


// ========== [05] 05_methods.ts ==========
// Level: Beginner. One handler per HTTP method.
// A route value can be { GET, POST, ... }. Verified on 1.4.4: a method you
// do not list (PUT here) is NOT answered 405; the request falls through to
// `fetch` (here a 404). If you want a proper 405 with an Allow header,
// return it yourself from fetch. HEAD is answered from GET automatically.
async function start05() {
  // 05. HTTP 메서드별 핸들러 (GET / POST)
  // 실행: bun --hot 05_methods.ts
  // 확인:
  //   curl http://localhost:3005/api/posts
  //   curl -X POST http://localhost:3005/api/posts \
  //     -H 'Content-Type: application/json' \
  //     -d '{"title":"첫 글"}'

  type Post = { id: number; title: string };

  const posts: Post[] = [
    { id: 1, title: "Hello Bun" },
    { id: 2, title: "routes 배우기" },
  ];

  let lastId = posts.length; // next id = ++lastId (see POST)

  const server = Bun.serve({
    port: 3005,
    routes: {
      "/api/posts": {
        GET: () => Response.json({ posts }),
        POST: async (req) => {
          // FIXED (was: invalid JSON -> 500, ids from posts.length + 1).
          // req.json() THROWS on invalid JSON, so it is caught and answered 400.
          // The parsed value is `unknown` until checked: `as { title?: string }`
          // alone would be a compile-time promise that nothing enforces.
          let body: { title?: unknown };
          try {
            body = (await req.json()) as { title?: unknown };
          } catch {
            return Response.json({ error: "invalid JSON" }, { status: 400 });
          }
          if (typeof body.title !== "string" || !body.title.trim()) {
            return Response.json({ error: "title required" }, { status: 400 });
          }
          // A counter never hands out the same id twice, even after deletes.
          const post: Post = { id: ++lastId, title: body.title.trim() };
          posts.push(post);
          return Response.json({ created: true, post }, { status: 201 });
        },
      },
    },
    fetch(req) {
      // FIXED: a method missing from the route object (PUT, DELETE, ...)
      // falls through to here; Bun does not answer 405 by itself (verified
      // on 1.4.4). The correct answer is 405 + an Allow header.
      if (new URL(req.url).pathname === "/api/posts") {
        return Response.json(
          { error: `${req.method} not allowed` },
          { status: 405, headers: { Allow: "GET, HEAD, POST" } },
        );
      }
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`05 methods → ${server.url}`);
    push("05", server);

}


// ========== [06] 06_query.ts ==========
// Level: Beginner. Query parameters.
// new URL(req.url).searchParams parses "?q=bun&page=2" and decodes %-escapes.
// Values are always strings or null. Number("") is 0 and Number("2x") is
// NaN, which is why the result is checked with Number.isInteger below.
async function start06() {
  // 06. 쿼리 파라미터 — new URL(req.url).searchParams
  // 실행: bun --hot 06_query.ts
  // 확인:
  //   curl 'http://localhost:3006/search?q=bun&page=2'
  //   curl 'http://localhost:3006/search'   # 400 기대

  const server = Bun.serve({
    port: 3006,
    routes: {
      "/": () =>
        new Response("예: GET /search?q=키워드&page=1"),
      "/search": (req) => {
        const url = new URL(req.url);
        // 쿼리가 없으면 get()은 null. ?. 덕분에 여기서 에러가 안 난다
        const term = url.searchParams.get("q")?.trim();
        const page = Number(url.searchParams.get("page") ?? "1");

        if (!term) {
          return Response.json({ error: "q required" }, { status: 400 });
        }
        if (!Number.isInteger(page) || page < 1) {
          return Response.json({ error: "bad page" }, { status: 400 });
        }

        return Response.json({
          term,
          page,
          results: [`${term} 결과 #${page}`],
        });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`06 query → ${server.url}`);
    push("06", server);

}


// ========== [07] 07_body.ts ==========
// Level: Beginner. Reading a request body three ways.
// A body can be read only ONCE: req.text(), req.json(), req.formData(),
// req.bytes() all consume the stream. Call one of them, not two.
async function start07() {
  // 07. 요청 바디 — text / json / formData
  // 실행: bun --hot 07_body.ts
  // 확인:
  //   curl -X POST http://localhost:3007/echo/text -d 'hello'
  //   curl -X POST http://localhost:3007/echo/json \
  //     -H 'Content-Type: application/json' -d '{"name":"bun"}'
  //   curl -X POST http://localhost:3007/echo/form -d 'name=bun&age=1'

  const server = Bun.serve({
    port: 3007,
    routes: {
      "/": () =>
        new Response(
          "POST /echo/text | /echo/json | /echo/form 을 호출해 보세요",
        ),
      "/echo/text": {
        POST: async (req) => {
          // text.length counts UTF-16 code units, not bytes: "한" is 1 here but 3
          // bytes on the wire. Use (await req.bytes()).length when you need bytes.
          const text = await req.text();
          return Response.json({ type: "text", length: text.length, text });
        },
      },
      "/echo/json": {
        POST: async (req) => {
          try {
            const data = await req.json();
            return Response.json({ type: "json", data });
          } catch {
            return Response.json({ error: "invalid JSON" }, { status: 400 });
          }
        },
      },
      "/echo/form": {
        POST: async (req) => {
          const form = await req.formData();
          // formData() parses both application/x-www-form-urlencoded and
          // multipart/form-data. Object.fromEntries keeps only the LAST value of a
          // repeated key (a=1&a=2 -> "2"); use form.getAll("a") for lists. A File
          // entry would serialize as {} in JSON.
          const entries = Object.fromEntries(form.entries());
          return Response.json({ type: "form", entries });
        },
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`07 body → ${server.url}`);
    push("07", server);

}


// ========== [08] 08_static.ts ==========
// Level: Beginner. Serving files with Bun.file.
// Bun.file(path) reads NOTHING when created; it is a lazy handle (a Blob).
// new Response(Bun.file(path)) lets Bun send the file with sendfile(2),
// so the bytes never enter JavaScript. Content-Type comes from the file
// extension, and (verified on 1.4.4) HEAD and Range requests are handled
// for you. A missing file makes the response fail with a 500 / ENOENT, so
// check `await file.exists()` when the file may not be there ([27] does).
async function start08() {
  // 08. 정적 파일 — Bun.file + Response
  // 실행: bun --hot 08_static.ts
  // 확인:
  //   curl http://localhost:3008/
  //   curl http://localhost:3008/readme.txt
  //   curl -o /tmp/out.html http://localhost:3008/page.html

  const ROOT = BASE_DIR; // UPDATED (compile): was import.meta.dir

  // 예제용 파일 (같은 폴더에 없으면 실행 시 생성)
  const readmePath = `${ROOT}/_static/readme.txt`;
  const pagePath = `${ROOT}/_static/page.html`;

  // Bun.write는 폴더가 없으면 만들고, 파일이 있으면 덮어쓴다
  await Bun.write(
    readmePath,
    "Bun.file 로 정적 파일을 서빙하는 초급 예제입니다.\n",
  );
  await Bun.write(
    pagePath,
    `<!DOCTYPE html>
  <html lang="ko">
  <head><meta charset="UTF-8" /><title>Static</title></head>
  <body><h1>정적 HTML</h1><p>Bun.file → Response</p></body>
  </html>
  `,
  );

  const server = Bun.serve({
    port: 3008,
    routes: {
      "/": () =>
        Response.json({
          files: ["/readme.txt", "/page.html"],
        }),
      // 요청마다 파일 읽기 (큰 파일·자주 바뀌는 파일에 적합)
      "/readme.txt": () => new Response(Bun.file(readmePath)),
      "/page.html": () =>
        new Response(Bun.file(pagePath), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`08 static → ${server.url}`);
    push("08", server);

}


// ========== [09] 09_cookies.ts ==========
// Level: Beginner. Cookies with req.cookies.
// req.cookies is a Bun.CookieMap parsed from the Cookie header. set() and
// delete() are remembered and written as Set-Cookie headers on the
// response automatically. httpOnly hides the cookie from page JavaScript;
// sameSite: "lax" stops it from being sent on most cross-site requests.
async function start09() {
  // 09. 쿠키 — req.cookies (BunRequest)
  // 실행: bun --hot 09_cookies.ts
  // 확인:
  //   curl -i -c /tmp/bun-c.txt -b /tmp/bun-c.txt http://localhost:3009/visit
  //   curl -i -c /tmp/bun-c.txt -b /tmp/bun-c.txt http://localhost:3009/visit
  //   curl -i -c /tmp/bun-c.txt -b /tmp/bun-c.txt http://localhost:3009/logout

  const server = Bun.serve({
    port: 3009,
    routes: {
      "/": () =>
        new Response("GET /visit → 방문 횟수 쿠키 | GET /logout → 쿠키 삭제"),
      "/visit": (req) => {
        // FIXED: cookies are client-controlled text. visits=abc used to give
        // NaN ("NaN번째"); anything that is not a non-negative integer now
        // counts as 0.
        const raw = req.cookies.get("visits") ?? "0";
        const prev = Number(raw);
        const visits = (Number.isSafeInteger(prev) && prev >= 0 ? prev : 0) + 1;
        // set만 해 두면 응답에 Set-Cookie 헤더가 알아서 붙는다
        req.cookies.set("visits", String(visits), {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
        });
        return Response.json({ visits, message: `${visits}번째 방문` });
      },
      "/logout": (req) => {
        // 삭제 = 만료된 쿠키를 다시 보내는 것. path가 처음과 같아야 지워진다
        req.cookies.delete("visits", { path: "/" });
        return Response.json({ ok: true, message: "visits 쿠키 삭제" });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`09 cookies → ${server.url}`);
    push("09", server);

}


// ========== [10] 10_redirect.ts ==========
// Level: Beginner. Static responses and redirects.
// A Response object (not a function) as a route value is prepared ONCE at
// startup and served from native code with no JS per request. Good for
// health checks and fixed JSON. Anything inside it is frozen at startup:
// a timestamp in a static Response.json never changes.
async function start10() {
  // 10. 정적 Response · 리다이렉트 · 헬스체크
  // 실행: bun --hot 10_redirect.ts
  // 확인:
  //   curl -i http://localhost:3010/health
  //   curl -i http://localhost:3010/blog          # 302 Location
  //   curl -i http://localhost:3010/api/config

  const server = Bun.serve({
    port: 3010,
    routes: {
      // Response 객체를 그대로 두면 제로할당 디스패치 (고정 응답에 적합)
      "/health": new Response("OK"),
      "/ready": new Response("Ready", {
        headers: { "X-Ready": "1" },
      }),
      // Response.redirect(url) defaults to 302 (temporary). 301/308 are cached
      // by browsers, sometimes forever, so use them only for permanent moves.
      "/blog": Response.redirect("https://bun.com/blog"),
      "/api/config": Response.json({
        version: "1.0.0",
        env: "development",
      }),
      "/": () =>
        Response.json({
          tip: ["GET /health", "GET /ready", "GET /blog", "GET /api/config"],
        }),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`10 redirect → ${server.url}`);
    push("10", server);

}


// ========== [11] 11_error.ts ==========
// Level: Beginner. Central error handling.
// error(err) is called for anything thrown inside routes or fetch and must
// return a Response. It is the single place to log, hide internals and
// choose the status code.
async function start11() {
  // 11. 에러 처리 — error 핸들러 + development
  // 실행: bun --hot 11_error.ts
  // 확인:
  //   curl -i http://localhost:3011/ok
  //   curl -i http://localhost:3011/boom          # error() 가 잡음
  //   curl -i http://localhost:3011/missing      # 404

  const server = Bun.serve({
    port: 3011,
    // Verified on 1.4.4: development is ALREADY true by default unless
    // NODE_ENV=production. With error() defined, your handler wins; without
    // it, Bun returns an HTML page with the message, stack and source code.
    // Note that this handler also returns err.message to the client: fine
    // for learning, but in production return a generic message ([70]).
    development: true,
    routes: {
      "/ok": () => Response.json({ ok: true }),
      "/boom": () => {
        throw new Error("의도적으로 터뜨린 에러");
      },
    },
    fetch() {
      return Response.json({ error: "Not Found" }, { status: 404 });
    },
    // 라우트/fetch 안에서 던진 에러 → 여기서 Response 로 변환
    error(err) {
      console.error("[error]", err);
      return Response.json(
        {
          error: "Internal Server Error",
          message: err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
      );
    },
  });

  console.log(`11 error → ${server.url}`);
    push("11", server);

}


// ========== [12] 12_data_formats.ts ==========
async function start12() {
  // Level: Beginner. Built-in parsers for common text formats.
  // Bun ships parsers for YAML, TOML, JSON5, JSONC (JSON with comments),
  // JSONL (one JSON value per line) and XML, imported from "bun". No npm
  // package needed. Every parser THROWS on invalid input, so each call is
  // wrapped in try/catch and turned into a 400 with the parser's message.
  // Try:
  //   curl -X POST 'localhost:3012/convert?from=yaml' --data-binary $'a: 1\nb: [x, y]'
  //   curl -X POST 'localhost:3012/convert?from=toml' --data-binary $'[server]\nport = 8080'
  //   curl -X POST localhost:3012/to/yaml -H 'Content-Type: application/json' -d '{"a":[1,2]}'
  // Notes: XML attributes come back as "@name" keys; TOML and XML have no
  // stringify here, YAML and JSON5 do. YAML.stringify(value, null, 2)
  // gives block style; without the indent argument it gives flow style
  // ({a: 1, b: [1,2]}), like JSON.stringify.

  // 포맷 이름으로 파서를 고르는 표. if/else를 길게 늘어놓지 않아도 된다
  const parsers: Record<string, (text: string) => unknown> = {
    json: (t) => JSON.parse(t),
    yaml: (t) => YAML.parse(t),
    toml: (t) => TOML.parse(t),
    json5: (t) => JSON5.parse(t), // trailing commas, unquoted keys, comments
    jsonc: (t) => JSONC.parse(t), // JSON + comments (tsconfig.json style)
    jsonl: (t) => JSONL.parse(t), // returns an array, one item per line
    xml: (t) => XML.parse(t),
  };

  const server = Bun.serve({
    port: 3012,
    routes: {
      "/": () =>
        Response.json({
          usage: [`POST /convert?from=${Object.keys(parsers).join("|")}  (body = text)`, "POST /to/yaml  (body = JSON)"],
        }),
      "/convert": {
        POST: async (req) => {
          const from = qp(req, "from") ?? "";
          const parse = parsers[from];
          if (!parse) return Response.json({ error: `from must be one of: ${Object.keys(parsers).join(", ")}` }, { status: 400 });
          const text = await req.text();
          try {
            return Response.json({ from, value: parse(text) });
          } catch (err) {
            return Response.json({ error: `invalid ${from}`, detail: (err as Error).message }, { status: 400 });
          }
        },
      },
      "/to/yaml": {
        POST: async (req) => {
          let value: unknown;
          try {
            value = await req.json();
          } catch {
            return Response.json({ error: "body must be JSON" }, { status: 400 });
          }
          return new Response(YAML.stringify(value, null, 2) + "\n", { headers: { "Content-Type": "text/yaml; charset=utf-8" } });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`12 data_formats → ${server.url}`);
  register("12", server);
}


// ========== [13] 13_hash_ids_passwords.ts ==========
// ★ IMPORTANT — raw calls of the official bun.com sample "Passwords"; the full log-in flow: [18].
async function start13() {
  // Level: Beginner. Hashes, ids and passwords: pick the right tool.
  //   Bun.hash (wyhash), xxHash3   very fast, NOT secure: cache keys,
  //                                sharding, dedup. Same input = same output.
  //   Bun.hash.crc32               checksums inside file formats (PNG, ZIP).
  //   CryptoHasher("sha256")       secure fingerprint: integrity, ETags.
  //   CryptoHasher("sha256", key)  HMAC: proves "made by someone who knows
  //                                the key" (signed cookies, webhooks).
  //   Bun.password.hash            for PASSWORDS only. Deliberately slow
  //                                (argon2id) and salted, so a stolen database
  //                                cannot be brute-forced cheaply. Never store
  //                                passwords with sha256.
  //   crypto.randomUUID()          v4: random.
  //   Bun.randomUUIDv7()           v7: starts with a timestamp, so ids sort by
  //                                creation time; good database keys.
  // Try:
  //   curl 'localhost:3013/hash?text=hello'
  //   curl localhost:3013/ids
  //   H=$(curl -s -X POST localhost:3013/password/hash -H 'Content-Type: application/json' -d '{"password":"pw"}' | bun -e 'console.log((await Bun.stdin.json()).hash)')
  //   curl -X POST localhost:3013/password/verify -H 'Content-Type: application/json' -d "{\"password\":\"pw\",\"hash\":\"$H\"}"

  const server = Bun.serve({
    port: 3013,
    routes: {
      "/hash": (req) => {
        const text = qp(req, "text") ?? "";
        return Response.json({
          text,
          // 해시값이 bigint라서 JSON에 넣으려면 문자열로 바꿔야 한다
          wyhash: Bun.hash(text).toString(),
          xxHash3: Bun.hash.xxHash3(text).toString(),
          crc32: Bun.hash.crc32(text).toString(16).padStart(8, "0"),
          sha256: sha256hex(text),
          hmacSha256: new Bun.CryptoHasher("sha256", "demo-key").update(text).digest("hex"),
        });
      },
      "/ids": () => {
        const v7 = [Bun.randomUUIDv7(), Bun.randomUUIDv7(), Bun.randomUUIDv7()];
        return Response.json({
          v4: crypto.randomUUID(),
          v7,
          v7SortsByCreationTime: [...v7].sort().join() === v7.join(),
          // v5는 랜덤이 아니다. 같은 이름이면 언제나 같은 id
          v5SameNameSameId: Bun.randomUUIDv5("bun.com", "dns"),
        });
      },
      "/password/hash": {
        POST: async (req) => {
          const body = (await readJsonCapped(req, 4096)) as { password?: unknown };
          if (typeof body.password !== "string" || body.password.length < 1 || body.password.length > 200) {
            throw new HttpError(422, "password: string of 1..200 characters");
          }
          const t0 = performance.now();
          // The result embeds algorithm, parameters and a random salt:
          // "$argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>". Hashing the same
          // password twice gives two different strings; verify() reads the
          // parameters back out of the string.
          const hash = await Bun.password.hash(body.password, { algorithm: "argon2id" });
          return Response.json({ hash, ms: Math.round(performance.now() - t0) });
        },
      },
      "/password/verify": {
        POST: async (req) => {
          const body = (await readJsonCapped(req, 4096)) as { password?: unknown; hash?: unknown };
          if (typeof body.password !== "string" || typeof body.hash !== "string") throw new HttpError(422, "password and hash: strings");
          let ok = false;
          try {
            ok = await Bun.password.verify(body.password, body.hash);
          } catch {
            throw new HttpError(400, "hash is not a valid password hash string");
          }
          return Response.json({ ok });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`13 hash_ids_passwords → ${server.url}`);
  register("13", server);
}


// ========== [14] 14_file_api.ts ==========
async function start14() {
  // Level: Beginner. The Bun file API as a tiny text-file service.
  //   Bun.write(path, data)     write (creates parent folders), returns bytes
  //   Bun.file(path)            lazy handle: .size .type .lastModified need no
  //                             read; .text() .bytes() .stream() do read
  //   await file.exists()       check before reading
  //   await file.delete()       remove
  //   new Bun.Glob("*.txt").scan({ cwd })   list files (async iterator)
  // All files live in ONE folder, _data/files-api, and the name regex has
  // no "/" so a name can never leave that folder (path traversal).
  // Try:
  //   curl -X PUT localhost:3014/files/hello.txt --data-binary 'hi there'
  //   curl localhost:3014/files
  //   curl localhost:3014/files/hello.txt/info
  //   curl -X DELETE localhost:3014/files/hello.txt

  const DIR = `${BASE_DIR}/_data/files-api`;
  await $`mkdir -p ${DIR}`.quiet(); // Bun Shell: built-in, cross-platform mkdir
  const NAME = /^[a-z0-9][a-z0-9-]{0,39}\.txt$/;
  const pathOf = (name: string) => {
    if (!NAME.test(name)) throw new HttpError(400, "name must look like my-note.txt ([a-z0-9-], .txt)");
    return `${DIR}/${name}`;
  };

  const server = Bun.serve({
    port: 3014,
    maxRequestBodySize: 64 * 1024, // bigger bodies get 413 before any JS runs
    routes: {
      "/files": async () => {
        const files = [];
        // scan()은 비동기 반복자라 for await로 하나씩 받는다
        for await (const name of new Bun.Glob("*.txt").scan({ cwd: DIR, onlyFiles: true })) {
          const f = Bun.file(`${DIR}/${name}`);
          files.push({ name, size: f.size, lastModified: new Date(f.lastModified).toISOString() });
        }
        files.sort((a, b) => a.name.localeCompare(b.name));
        return Response.json(files);
      },
      "/files/:name": {
        GET: async (req) => {
          const file = Bun.file(pathOf(req.params.name));
          if (!(await file.exists())) throw new HttpError(404, `${req.params.name} not found`);
          return new Response(file, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        },
        PUT: async (req) => {
          const path = pathOf(req.params.name);
          const existed = await Bun.file(path).exists();
          // 반환값은 실제로 쓴 바이트 수
          const written = await Bun.write(path, await req.text());
          return Response.json({ name: req.params.name, bytes: written, created: !existed }, { status: existed ? 200 : 201 });
        },
        DELETE: async (req) => {
          const file = Bun.file(pathOf(req.params.name));
          if (!(await file.exists())) throw new HttpError(404, `${req.params.name} not found`);
          await file.delete();
          return new Response(null, { status: 204 });
        },
      },
      "/files/:name/info": async (req) => {
        // A NEW Bun.file each time: a BunFile caches what it learned, so an
        // old handle can report stale size/exists after the file changed.
        const file = Bun.file(pathOf(req.params.name));
        const exists = await file.exists();
        return Response.json({
          name: req.params.name,
          exists,
          size: exists ? file.size : null,
          type: file.type, // MIME type guessed from the extension, no read needed
          lastModified: exists ? new Date(file.lastModified).toISOString() : null,
        });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`14 file_api → ${server.url}`);
  register("14", server);
}


// ========== [15] 15_markdown_escape.ts ==========
async function start15() {
  // Level: Beginner. Rendering user-written Markdown WITHOUT XSS.
  // Verified on 1.4.4: Bun.markdown.html(md) passes raw HTML through, so
  // "<script>" or "<img onerror=...>" in user input reaches the browser.
  // Three options turn raw HTML into visible text:
  //   tagFilter: true, noHtmlBlocks: true, noHtmlSpans: true
  // but links like [x](javascript:alert(1)) survive in every mode, so a
  // second pass with HTMLRewriter ([44]) removes hrefs that are not
  // http(s), mailto, relative or #anchors. A Content-Security-Policy
  // header is the third layer: even if something slips through, the
  // browser refuses to run inline scripts.
  // Bun.escapeHTML(text) escapes & < > " ' for putting plain text into HTML.
  // Try:
  //   curl -X POST localhost:3015/render/compare --data-binary $'# Hi <script>alert(1)</script>\n[x](javascript:alert(1))'
  //   curl 'localhost:3015/escape?text=<b>"hi"</b>'

  const SAFE_URL = /^(https?:|mailto:|\/|#)/i;

  async function renderSafe(md: string): Promise<string> {
    const html = Bun.markdown.html(md, { tagFilter: true, noHtmlBlocks: true, noHtmlSpans: true });
    // HTML을 흘려 읽으면서 선택자에 걸린 태그만 손보는 변환기
    return new HTMLRewriter()
      .on("a[href]", {
        element(el) {
          const href = el.getAttribute("href") ?? "";
          if (!SAFE_URL.test(href)) el.removeAttribute("href");
          else if (/^https?:/i.test(href)) el.setAttribute("rel", "noopener noreferrer nofollow");
        },
      })
      .on("img[src]", {
        element(el) {
          if (!/^(https?:|\/)/i.test(el.getAttribute("src") ?? "")) el.removeAttribute("src");
        },
      })
      // 문자열이 아니라 Response를 넣고 Response를 돌려받는다
      .transform(new Response(html))
      .text();
  }

  const server = Bun.serve({
    port: 3015,
    maxRequestBodySize: 100 * 1024,
    routes: {
      "/": () => new Response("POST /render (markdown -> HTML page) | POST /render/compare | GET /escape?text=\n"),
      "/render": {
        POST: async (req) => {
          const body = await renderSafe(await req.text());
          const page = `<!doctype html><meta charset="utf-8"><title>Preview</title><article>${body}</article>`;
          return new Response(page, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'",
            },
          });
        },
      },
      "/render/compare": {
        POST: async (req) => {
          const md = await req.text();
          return Response.json({ unsafeDefault: Bun.markdown.html(md), safe: await renderSafe(md) });
        },
      },
      "/escape": (req) => Response.json({ escaped: Bun.escapeHTML(qp(req, "text") ?? "") }),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`15 markdown_escape → ${server.url}`);
  register("15", server);
}


// ========== [16] 16_compression.ts ==========
async function start16() {
  // Level: Beginner. Compressing responses (content negotiation).
  // The client says what it can decode in Accept-Encoding ("gzip, br,
  // zstd"). The server picks one, compresses, and says which in
  // Content-Encoding. Vary: Accept-Encoding tells caches that the body
  // differs per client. Bun.serve does NOT compress automatically.
  // Here the variants are compressed ONCE at startup (the data is fixed);
  // compressing per request costs CPU on every hit.
  // Verified on 1.4.4: Bun's fetch sends Accept-Encoding and decodes
  // gzip and zstd transparently, so `await res.text()` is plain text.
  // Try:
  //   curl -s -H 'Accept-Encoding: gzip' localhost:3016/data -o /dev/null -w '%{size_download} bytes\n'
  //   curl -s localhost:3016/data -o /dev/null -w '%{size_download} bytes\n'
  //   curl localhost:3016/sizes

  const json = JSON.stringify({
    items: Array.from({ length: 500 }, (_, i) => ({ id: i, name: `item-${i}`, tags: ["alpha", "beta", "gamma"] })),
  });
  const variants = {
    zstd: Bun.zstdCompressSync(json),
    gzip: Bun.gzipSync(json),
    identity: new TextEncoder().encode(json),
  };

  /** Parse "gzip;q=0.5, zstd, br;q=0" into the encodings with q > 0. */
  function accepted(header: string | null): Set<string> {
    const out = new Set<string>();
    for (const part of (header ?? "").split(",")) {
      const [name, ...params] = part.trim().toLowerCase().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      // q=0 은 '이 인코딩은 쓰지 마'라는 뜻이라 뺀다
      if (name && (!q || Number(q.trim().slice(2)) > 0)) out.add(name);
    }
    return out;
  }

  const server = Bun.serve({
    port: 3016,
    routes: {
      "/data": (req) => {
        const ok = accepted(req.headers.get("accept-encoding"));
        // zstd가 gzip보다 작고 빨라서 먼저 고른다
        const enc = ok.has("zstd") ? "zstd" : ok.has("gzip") ? "gzip" : "identity";
        const headers: Record<string, string> = { "Content-Type": "application/json", Vary: "Accept-Encoding", "X-Uncompressed-Length": String(json.length) };
        if (enc !== "identity") headers["Content-Encoding"] = enc;
        return new Response(variants[enc], { headers });
      },
      "/sizes": () =>
        Response.json({ identity: variants.identity.length, gzip: variants.gzip.length, zstd: variants.zstd.length }),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`16 compression → ${server.url}`);
  register("16", server);
}


// ========== [17] 17_http_server.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "HTTP server".
async function start17() {
  // Level: Beginner. Bun.serve() with routes, params, static responses and
  // Bun.sql, written the way a real API needs it.
  //
  // The official sample is: routes "/" -> new Response("Welcome to Bun!") and
  // "/api/users/:id" -> `await sql\`SELECT * FROM users WHERE id = ${id}\``.
  // This version adds what that sample leaves out:
  //   - the id is validated (a non-number is 400, not a database error);
  //   - a missing row is 404, not `null` with status 200;
  //   - POST creates a user and answers 201 + Location;
  //   - every error becomes JSON through `error()` (no stack traces leak);
  //   - the database is closed when the server stops.
  //
  // How the pieces work
  //   routes        Matched natively (in Zig/C++) before any JavaScript runs.
  //                 Order does not matter; exact paths beat ":params", and
  //                 params beat "/*" (see [61]).
  //   static route  "/" holds a Response OBJECT, not a function. Bun builds it
  //                 once and answers every request from memory without
  //                 calling into JavaScript at all: the fastest route type.
  //   per-method    { GET, POST } objects. A method you do not list falls
  //                 through to `fetch` (verified on 1.4.4: 404, not 405).
  //   Bun.sql       `sql\`... ${value}\`` is a tagged template: the database
  //                 receives the SQL text and the values SEPARATELY (bound
  //                 parameters), so a value can never change the query.
  //                 That is why the template form is injection-safe and
  //                 string concatenation is not.
  //                 The official sample uses the default `sql`, which
  //                 connects to $DATABASE_URL. Here a private SQLite
  //                 database in memory is used, so the example runs
  //                 anywhere; [50] shows the same API against Postgres.
  // Try:
  //   curl localhost:3017/
  //   curl localhost:3017/api/users/1
  //   curl localhost:3017/api/users/abc            # 400
  //   curl localhost:3017/api/users/999            # 404
  //   curl -i localhost:3017/api/users -H 'Content-Type: application/json' -d '{"name":"Dan","email":"dan@example.com"}'

  const sql = new SQL(":memory:"); // adapter chosen from the URL: SQLite here
  await sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)`;
  // sql(배열)을 넣으면 여러 행을 INSERT 한 번으로 넣는다
  await sql`INSERT INTO users ${sql([
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
  ])}`;

  const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

  const server = Bun.serve({
    port: 3017,
    routes: {
      "/": new Response("Welcome to Bun!"),
      "/favicon.ico": new Response(null, { status: 204 }), // browsers ask for it; answer cheaply
      "/api/users": {
        GET: async () => Response.json(await sql`SELECT id, name, email FROM users ORDER BY id LIMIT 100`),
        POST: async (req) => {
          const body = (await readJsonCapped(req, 4096)) as { name?: unknown; email?: unknown };
          const name = typeof body.name === "string" ? body.name.trim() : "";
          const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
          if (name.length < 1 || name.length > 50) throw new HttpError(422, "name: 1-50 characters");
          if (!EMAIL.test(email)) throw new HttpError(422, "email: not an e-mail address");
          try {
            // RETURNING gives the stored row back in the same round trip.
            const [user] = await sql`INSERT INTO users ${sql({ name, email })} RETURNING id, name, email`;
            return Response.json(user, { status: 201, headers: { Location: `/api/users/${user.id}` } });
          } catch (err) {
            if ((err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") throw new HttpError(409, "email already registered");
            throw err;
          }
        },
      },
      "/api/users/:id": async (req) => {
        // req.params is typed from the route string: { id: string }.
        if (!/^\d{1,9}$/.test(req.params.id)) throw new HttpError(400, "id must be a positive integer");
        const [user] = await sql`SELECT id, name, email FROM users WHERE id = ${Number(req.params.id)}`;
        if (!user) throw new HttpError(404, `user ${req.params.id} not found`);
        return Response.json(user);
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`17 http_server ★ → ${server.url}`);
  // 서버를 먼저 멈추고 DB를 닫아야 처리 중인 요청이 안 깨진다
  register("17", {
    url: server.url,
    stop: async (force?: boolean) => {
      await server.stop(force);
      await sql.close();
    },
  });
}


// ========== [18] 18_passwords.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "Passwords".
async function start18() {
  // Level: Beginner. Sign-up and log-in with Bun.password, done right.
  //
  // The official sample: Bun.password.hash(pw) (argon2id), .verify(pw, hash),
  // and .hash(pw, { algorithm: "bcrypt", cost: 12 }). [13] shows the raw
  // calls; this example is the FLOW a login system needs around them:
  //   1. never store the password, only the hash string. It contains the
  //      algorithm, the parameters and a random salt:
  //        $argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>
  //      so verify() needs no other information;
  //   2. unknown user: still run one verify() against a dummy hash, so the
  //      answer takes as long as for a real user. Otherwise response time
  //      reveals which user names exist (user enumeration);
  //   3. one generic message for "no such user" and "wrong password";
  //   4. upgrade on log-in: an old bcrypt hash that verifies is replaced by
  //      an argon2id hash. Moving to a stronger algorithm needs no password
  //      reset, because the plain password is only available at log-in;
  //   5. limit the length (here 1-200 characters): hashing is deliberately
  //      slow and memory-hungry, so huge inputs are a cheap DoS;
  //   6. use the async hash()/verify() in servers: the work runs on a
  //      thread pool and the event loop keeps serving. hashSync() blocks.
  // Verified on 1.4.4: bcrypt only reads the first 72 bytes of a password,
  // and Bun keeps that behaviour: two 80-character passwords that differ
  // only after byte 72 verify against the same bcrypt hash. argon2id has no
  // such limit, which is one more reason it is the default.
  // Try:
  //   curl localhost:3018/signup -H 'Content-Type: application/json' -d '{"user":"ada","password":"correct horse"}'
  //   curl localhost:3018/login  -H 'Content-Type: application/json' -d '{"user":"ada","password":"correct horse"}'
  //   curl localhost:3018/login  -H 'Content-Type: application/json' -d '{"user":"legacy","password":"old-password"}'

  const USER = /^[a-z0-9_-]{3,32}$/;
  const users = new Map<string, string>(); // user -> hash string
  // A legacy account whose hash was made by an older system with bcrypt.
  // cost 4 keeps start-up fast; production bcrypt uses cost 10-12.
  users.set("legacy", await Bun.password.hash("old-password", { algorithm: "bcrypt", cost: 4 }));
  // The dummy hash for unknown users (computed once, never matches).
  const DUMMY = await Bun.password.hash(crypto.randomUUID());

  async function readCredentials(req: Request) {
    const body = (await readJsonCapped(req, 4096)) as { user?: unknown; password?: unknown };
    if (typeof body.user !== "string" || !USER.test(body.user)) throw new HttpError(422, "user: 3-32 of [a-z0-9_-]");
    if (typeof body.password !== "string" || body.password.length < 1 || body.password.length > 200) {
      throw new HttpError(422, "password: 1-200 characters");
    }
    return { user: body.user, password: body.password };
  }
  // 해시 문자열 앞부분만 봐도 어떤 알고리즘인지 알 수 있다
  const algorithmOf = (hash: string) => (hash.startsWith("$argon2id$") ? "argon2id" : hash.startsWith("$2") ? "bcrypt" : "other");

  const server = Bun.serve({
    port: 3018,
    routes: {
      "/signup": {
        POST: async (req) => {
          const { user, password } = await readCredentials(req);
          if (users.has(user)) throw new HttpError(409, "user exists");
          users.set(user, await Bun.password.hash(password)); // argon2id by default
          return Response.json({ user, algorithm: "argon2id" }, { status: 201 });
        },
      },
      "/login": {
        POST: async (req) => {
          const { user, password } = await readCredentials(req);
          const hash = users.get(user);
          const ok = await Bun.password.verify(password, hash ?? DUMMY); // same cost either way
          if (!hash || !ok) throw new HttpError(401, "wrong user or password");
          let upgraded = false;
          if (algorithmOf(hash) !== "argon2id") {
            users.set(user, await Bun.password.hash(password));
            upgraded = true;
          }
          return Response.json({ user, ok: true, upgraded, algorithm: algorithmOf(users.get(user)!) });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`18 passwords ★ → ${server.url}`);
  register("18", server);
}


// ========== [19] 19_stdlib_utils.ts ==========
async function start19() {
  // Level: Beginner. The small built-ins you reach for every day.
  // bun.com lists "Bun.escapeHTML() and 40+ utilities". The useful ones,
  // each shown with a real input and its output at GET /utils:
  //   Bun.escapeHTML(s)        & < > " ' -> entities. Use it whenever user
  //                            text goes into HTML (see /escape). Fast:
  //                            SIMD, returns the same string if nothing to do.
  //   Bun.deepEquals(a, b)     structural equality (what expect().toEqual uses).
  //                            Third argument `true` = strict: {a: undefined}
  //                            is then NOT equal to {}.
  //   Bun.inspect(v)           the string console.log would print; .table()
  //                            gives the console.table box as a string.
  //   Bun.stringWidth(s)       columns a string takes in a terminal: Korean
  //                            characters count 2, ANSI colour codes 0. Use it
  //                            to align CLI output; .length gets this wrong.
  //   Bun.semver               satisfies("1.4.5", "^1.4.0"), order(a, b) -> -1|0|1.
  //   Bun.peek(promise)        read a settled promise's value synchronously
  //                            (returns the promise itself if still pending).
  //   Bun.nanoseconds()        monotonic high-resolution clock since start.
  //   Bun.sleep(ms)            a promise-based setTimeout.
  //   Bun.color(input, fmt)    parse/convert CSS colours ("red" -> "#ff0000").
  //   Bun.Glob#match(path)     test a path against a glob WITHOUT touching
  //                            the disk ([14]/[75] use .scan() to list files).
  //   Bun.fileURLToPath(url)   file:///a%20b -> "/a b" (and pathToFileURL).
  //   structuredClone(v)       deep copy with the same algorithm postMessage
  //                            uses for Workers ([76]) and IPC ([79]): Map, Set,
  //                            Date, typed arrays survive; functions throw.
  //   Bun.version / Bun.revision   the running Bun (1.4.5 + git commit); [20] shows more.
  //   Bun.env                  the same object as process.env. Bun loads .env,
  //                            .env.local and .env.<NODE_ENV> automatically
  //                            before your code runs: no dotenv package.
  //   import.meta              .dir/.file/.path of THIS file, .main is true
  //                            only in the entry file (Bun.main is its path).
  // Bun.YAML / TOML IMPORTS: besides parsing strings ([12]), Bun can import
  // a .yaml/.toml/.json5/.jsonc file like a module (GET /config). The file
  // is parsed once at import time and cached like any module, and a static
  // import is even type-checked/bundled by `bun build`.
  // Try:
  //   curl localhost:3019/utils
  //   curl 'localhost:3019/escape?name=<script>alert(1)</script>'
  //   curl localhost:3019/config

  const CONFIG_DIR = `${BASE_DIR}/_data/config`;
  await writeIfMissing(`${CONFIG_DIR}/app.toml`, `# loaded with import()\n[server]\nport = 8080\nhosts = ["a.example", "b.example"]\n`);
  await writeIfMissing(`${CONFIG_DIR}/features.yaml`, `# loaded with import()\nbeta: true\nlimits:\n  upload_mb: 4\n`);

  const server = Bun.serve({
    port: 3019,
    routes: {
      "/utils": async () => {
        const t0 = Bun.nanoseconds();
        await Bun.sleep(5);
        const settled = Promise.resolve(42);
        // 영원히 안 끝나는 Promise. peek이 그대로 돌려주는지 보려고
        const pending = new Promise(() => {});
        const original = { when: new Date(0), tags: new Set(["a"]), counts: new Map([["x", 1]]) };
        const copy = structuredClone(original);
        let cloneFunction = "";
        try {
          structuredClone({ fn: () => 1 });
        } catch (err) {
          cloneFunction = (err as Error).name; // DataCloneError
        }
        const glob = new Bun.Glob("src/**/*.{ts,tsx}");
        return Response.json({
          escapeHTML: Bun.escapeHTML(`<a href="x">Tom & 'Jerry'</a>`),
          deepEquals: {
            loose: Bun.deepEquals({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }),
            undefinedLoose: Bun.deepEquals({ a: undefined }, {}),
            undefinedStrict: Bun.deepEquals({ a: undefined }, {}, true),
          },
          inspect: Bun.inspect({ nested: { deep: [1, 2, 3] } }),
          inspectTable: Bun.inspect.table([{ name: "ada", lang: "ts" }, { name: "linus", lang: "c" }]),
          stringWidth: { abc: Bun.stringWidth("abc"), korean: Bun.stringWidth("한글"), ansi: Bun.stringWidth("\x1b[31mred\x1b[0m"), lengthOfKorean: "한글".length },
          semver: { satisfies: Bun.semver.satisfies(Bun.version, "^1.4.0"), order: Bun.semver.order("1.10.0", "1.9.0") },
          peek: { settled: Bun.peek(settled), pendingIsSame: Bun.peek(pending) === pending },
          sleptMs: Math.round((Bun.nanoseconds() - t0) / 1e6),
          color: { red: Bun.color("red", "hex"), rgba: Bun.color("#ff000080", "rgba"), number: Bun.color("white", "number") },
          glob: { tsx: glob.match("src/ui/app.tsx"), md: glob.match("src/readme.md") },
          fileURLToPath: Bun.fileURLToPath(new URL("file:///tmp/a%20b.txt")),
          structuredClone: {
            dateKept: copy.when instanceof Date,
            setKept: copy.tags instanceof Set,
            mapKept: copy.counts.get("x") === 1,
            isNewObject: copy !== original,
            functionThrows: cloneFunction,
          },
          runtime: { version: Bun.version, revision: Bun.revision.slice(0, 7), envIsProcessEnv: Bun.env === process.env, port: Bun.env.PORT ?? "(PORT not set: default it like this)" },
          importMeta: { file: import.meta.file, isMain: import.meta.main, mainIsThisFile: Bun.main === import.meta.path },
        });
      },
      "/escape": (req) => {
        const name = qp(req, "name") ?? "world";
        // The ONLY difference between safe and unsafe here is escapeHTML().
        return new Response(`<!doctype html><meta charset="utf-8"><p>Hello, ${Bun.escapeHTML(name)}!</p>`, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
      "/config": async () => {
        // The default export of a TOML/YAML module is the parsed object.
        const app = (await import(`${CONFIG_DIR}/app.toml`)).default;
        const features = (await import(`${CONFIG_DIR}/features.yaml`)).default;
        return Response.json({ app, features });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`19 stdlib_utils → ${server.url}utils`);
  register("19", server);
}


// ========== [20] 20_runtime_versions.ts ==========
// NEW in Bun 1.4.5 edition.
async function start20() {
  // Level: Beginner. Which Bun is running, and what is built into it?
  // Bun 1.4.5 (November 2026) is a SECURITY release: it adds no new API.
  // It fixes HTTP/3, TLS and DNS problems and updates the native libraries
  // Bun is built from (lsquic, c-ares, SQLite, llhttp, BoringSSL). Your code
  // does not change, but behaviour can, so it pays to know exactly what you
  // are running:
  //   Bun.version              "1.4.5" (the same as process.versions.bun)
  //   Bun.revision             the git commit Bun was built from
  //   process.versions         the libraries inside Bun, as versions or
  //                            commit hashes: boringssl, llhttp, sqlite,
  //                            zstd, ares (c-ares DNS), uwebsockets, webkit ...
  //   Bun.semver.satisfies(v, ">=1.4.5")   a version gate for your app
  //   Bun.semver.order(a, b)   -1 | 0 | 1, compares versions correctly
  //                            ("1.10.0" > "1.9.0", unlike a string compare)
  // process.versions.sqlite is the SQLite that bun:sqlite really uses. On
  // Linux and Windows Bun bundles SQLite (3.54.1 in Bun 1.4.5). On macOS Bun
  // uses the system's libsqlite3, whose version comes with macOS, unless
  // SQLITE_LIB at the top of the file switched to Homebrew's 3.54.1 with
  // Database.setCustomSQLite(). /versions shows which one is in use.
  // The 1.4.5 changes are shown live in: [32] SQLite 3.54 rules,
  // [56] RSA signatures with SHA-3 (node:crypto), [63] TLS certificate errors.
  // Try:
  //   curl localhost:3020/versions
  //   curl 'localhost:3020/require?min=1.4.5'
  //   curl 'localhost:3020/require?min=2.0.0'
  //   curl localhost:3020/changes

  const MIN_BUN = "1.4.5";
  // A start-up gate: warn (or exit) when the runtime is too old.
  if (!Bun.semver.satisfies(Bun.version, `>=${MIN_BUN}`)) {
    console.warn(`[20] Bun ${Bun.version} is older than ${MIN_BUN}: [56] and [63] show 1.4.5 behaviour`);
  }

  // Ask SQLite itself: this is the version bun:sqlite actually links.
  // :memory: 는 파일 없이 메모리에만 만드는 DB
  const probe = new Database(":memory:");
  const sqliteInUse = (probe.query("SELECT sqlite_version() AS v").get() as { v: string }).v;
  probe.close();

  // Hashes are long; 12 characters are enough to compare two builds.
  const short = (v: string | undefined) => (v && /^[0-9a-f]{40}$/.test(v) ? v.slice(0, 12) : v ?? null);
  const LIBRARIES = ["boringssl", "llhttp", "sqlite", "zstd", "ares", "uwebsockets", "webkit", "zlib"] as const;

  const server = Bun.serve({
    port: 3020,
    routes: {
      "/versions": () =>
        Response.json({
          bun: Bun.version,
          revision: Bun.revision.slice(0, 12),
          platform: process.platform,
          arch: process.arch,
          libraries: Object.fromEntries(LIBRARIES.map((name) => [name, short(process.versions[name])])),
          sqlite: {
            inUse: sqliteInUse,
            source: SQLITE_SOURCE,
            has354Rules: Bun.semver.satisfies(sqliteInUse, ">=3.54.0"),
          },
        }),
      "/require": (req) => {
        const min = qp(req, "min") ?? MIN_BUN;
        // Bun.semver.satisfies() never throws: a bad range is just `false`.
        // Validate first, so a typo is a 400 and not a silent "too old".
        if (!/^\d+\.\d+\.\d+$/.test(min)) throw new HttpError(400, "min must look like 1.4.5");
        return Response.json({
          running: Bun.version,
          required: min,
          ok: Bun.semver.satisfies(Bun.version, `>=${min}`),
          order: Bun.semver.order(Bun.version, min), // -1 older, 0 same, 1 newer
        });
      },
      "/changes": () =>
        Response.json({
          release: "1.4.5",
          kind: "security release: no new APIs",
          fixedAreas: ["HTTP/3", "HTTP/1.1", "TLS", "DNS", "Zstandard"],
          updated: {
            lsquic: "4.9.4 -> 4.11.2",
            "c-ares": "1.34.8 -> 1.34.9",
            sqlite: "3.53.4 -> 3.54.1",
            llhttp: "9.4.2 -> 9.4.4",
            boringssl: "August 2026 -> November 2026",
          },
          behaviourChanges: {
            "[32]": "SQLite 3.54: ALTER TABLE refuses columns named rowid/oid/_rowid_; the authorizer sees functions in DEFAULT expressions",
            "[56]": "node:crypto: RSA sign/verify with SHA-3, SHA-512/224, SHA-512/256 and RIPEMD-160 no longer throws",
            "[63]": "TLS: an expired cert from an unknown issuer reports CERT_HAS_EXPIRED; custom roots (ca) are validated more strictly",
          },
        }),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`20 runtime_versions → ${server.url}versions  (Bun ${Bun.version}, SQLite ${sqliteInUse})`);
  register("20", server);
}


// ############################################################################
// ############################################################################
//
//   INTERMEDIATE  [21]-[56]  (36 examples)
//
// ############################################################################
// ############################################################################

// ========== [21] 21_websocket.ts ==========
// ★ IMPORTANT — first step towards the official bun.com sample "WebSockets"; full version: [49].
// Level: Intermediate. WebSocket echo.
// A WebSocket starts as a normal HTTP request with "Upgrade: websocket".
// server.upgrade(req) hands the socket to the WebSocket engine and writes
// the 101 Switching Protocols reply itself. After that, both sides can send
// messages at any time. Handlers live in `websocket: { open, message,
// close }`, one set for all sockets; per-socket state goes in ws.data
// (see [29]).
async function start21() {
  // 21. WebSocket — 에코 서버
  // 실행: bun --hot 21_websocket.ts
  // 확인 (브라우저 콘솔 또는 아래 스크립트):
  //   const ws = new WebSocket("ws://localhost:3021/ws");
  //   ws.onmessage = (e) => console.log(e.data);
  //   ws.onopen = () => ws.send("안녕");
  //
  // 또는: bun -e '
  //   const ws = new WebSocket("ws://localhost:3021/ws");
  //   ws.addEventListener("message", (e) => { console.log(e.data); ws.close(); });
  //   ws.addEventListener("open", () => ws.send("ping"));
  // '

  const html = `<!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>WS Echo</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 2rem; }
      #log { white-space: pre-wrap; background: #f4f4f5; padding: 1rem; }
    </style>
  </head>
  <body>
    <h1>WebSocket Echo</h1>
    <input id="msg" value="hello" />
    <button id="send">보내기</button>
    <pre id="log"></pre>
    <script>
      const log = document.getElementById("log");
      const ws = new WebSocket("ws://" + location.host + "/ws");
      ws.onmessage = (e) => { log.textContent += "← " + e.data + "\\n"; };
      ws.onopen = () => { log.textContent += "연결됨\\n"; };
      document.getElementById("send").onclick = () => {
        const v = document.getElementById("msg").value;
        ws.send(v);
        log.textContent += "→ " + v + "\\n";
      };
    </script>
  </body>
  </html>`;

  const server = Bun.serve({
    port: 3021,
    routes: {
      "/": () =>
        new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    },
    fetch(req, server) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        // HTTP → WebSocket 업그레이드
        // When upgrade() succeeds you must return undefined: the HTTP reply was
        // already sent. `as never` only satisfies TypeScript.
        if (server.upgrade(req)) return undefined as never;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      open(ws) {
        ws.send("connected");
      },
      message(ws, message) {
        // `message` is a string for text frames and a Buffer for binary frames;
        // the template string decodes a Buffer as UTF-8.
        ws.send(`echo: ${message}`);
      },
      close(ws) {
        console.log("client closed");
      },
    },
  });

  console.log(`21 websocket → ${server.url}`);
    push("21", server);

}


// ========== [22] 22_cors.ts ==========
// Level: Intermediate. CORS.
// Browsers block JS on origin A from reading responses from origin B unless
// B says so with Access-Control-Allow-* headers. For non-simple requests
// (custom headers like Authorization, methods like PUT, JSON bodies) the
// browser first sends an OPTIONS "preflight"; answering it with 204 + the
// headers lets the real request through. CORS is enforced by browsers
// only: curl and servers ignore it, so it is NOT an access control.
async function start22() {
  // 22. CORS — 프리플라이트(OPTIONS) 포함
  // 실행: bun --hot 22_cors.ts
  // 확인:
  //   curl -i -X OPTIONS http://localhost:3022/api/hello \
  //     -H 'Origin: http://localhost:5173' \
  //     -H 'Access-Control-Request-Method: GET'
  //   curl -i http://localhost:3022/api/hello -H 'Origin: http://localhost:5173'

  const CORS = {
    // "*" cannot be combined with credentials (cookies): browsers refuse it.
    // To allow cookies, echo one trusted Origin, add
    // Access-Control-Allow-Credentials: true and Vary: Origin. Adding
    // Access-Control-Max-Age: 600 lets browsers cache the preflight.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  const server = Bun.serve({
    port: 3022,
    async fetch(req) {
      // 프리플라이트: 브라우저가 본 요청 전에 '보내도 돼?' 하고 먼저 묻는 요청
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
      }

      const url = new URL(req.url);
      if (url.pathname === "/api/hello") {
        return Response.json({ message: "cors ok" }, { headers: CORS });
      }

      return Response.json({ error: "Not Found" }, { status: 404, headers: CORS });
    },
  });

  console.log(`22 cors → ${server.url}`);
    push("22", server);

}


// ========== [23] 23_upload.ts ==========
// Level: Intermediate. Multipart upload.
// req.formData() parses multipart/form-data; parts with a filename become
// File objects (a Blob plus name/type). Bun.write(path, file) streams the
// File to disk.
// Missing on purpose to keep it short (see [75] for a hardened version):
// no allow-list of types, no per-file size limit (the only limit is the
// default maxRequestBodySize of 128 MB), no check that a ".png" is really
// a PNG, and file.type is whatever the client claimed.
async function start23() {
  // 23. 파일 업로드 — multipart formData + File + Bun.write
  // 실행: bun --hot 23_upload.ts
  // 확인:
  //   echo 'hello upload' > /tmp/demo.txt
  //   curl -F 'file=@/tmp/demo.txt' http://localhost:3023/upload
  //   ls ./_uploads

  const UPLOAD_DIR = `${BASE_DIR}/_uploads`;

  // Bun.write creates missing parent folders, so writing an empty .keep
  // file is a cheap "mkdir -p".
  await Bun.write(`${UPLOAD_DIR}/.keep`, "");

  const server = Bun.serve({
    port: 3023,
    routes: {
      "/": () =>
        new Response(
          "POST /upload (multipart, field name: file)\n예: curl -F 'file=@./readme.md' http://localhost:3023/upload\n",
        ),
      "/upload": {
        POST: async (req) => {
          const form = await req.formData();
          // 파일 칸이면 File, 일반 입력칸이면 문자열이 들어 있다
          const file = form.get("file");

          if (!(file instanceof File)) {
            return Response.json(
              { error: "file field required (multipart)" },
              { status: 400 },
            );
          }

          // 간단 안전: 파일명에서 경로 분리자 제거
          // Replacing / and \ blocks path traversal ("../x" becomes ".._x"), and
          // the Date.now() prefix below means a name can never be just "..".
          const safeName = file.name.replace(/[/\\]/g, "_") || "upload.bin";
          const out = `${UPLOAD_DIR}/${Date.now()}_${safeName}`;
          await Bun.write(out, file);

          return Response.json({
            saved: out,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
          });
        },
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`23 upload → ${server.url}`);
    push("23", server);

}


// ========== [24] 24_sse.ts ==========
// Level: Intermediate. Server-Sent Events (SSE).
// One GET whose response never ends; the server writes blocks of
// "data: ...\n\n". Browsers read it with EventSource. SSE is one-way
// (server -> client) and plain HTTP; WebSocket ([21]) is two-way.
async function start24() {
  // 24. SSE (Server-Sent Events) — 실시간 이벤트 스트림
  // 실행: bun --hot 24_sse.ts
  // 확인:
  //   curl -N http://localhost:3024/events
  //   브라우저: http://localhost:3024/

  const html = `<!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>SSE</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 2rem; }
      #log { white-space: pre-wrap; background: #f4f4f5; padding: 1rem; }
    </style>
  </head>
  <body>
    <h1>SSE Demo</h1>
    <pre id="log"></pre>
    <script>
      const log = document.getElementById("log");
      const es = new EventSource("/events");
      es.onmessage = (e) => { log.textContent += e.data + "\\n"; };
      // FIXED: the server sends "event: done" last; closing here stops the
      // browser from reconnecting and replaying 1..10 forever.
      es.addEventListener("done", () => { log.textContent += "(done)\\n"; es.close(); });
    </script>
  </body>
  </html>`;

  const server = Bun.serve({
    port: 3024,
    routes: {
      "/": () =>
        new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      "/events": (req, srv) => {
        // 기본 idleTimeout(10s)에 끊기지 않도록 비활성
        // Verified on 1.4.4: idleTimeout closes a streaming response that stays
        // SILENT longer than the limit. This stream writes every 500 ms, so it
        // would survive anyway; timeout(req, 0) matters for quiet streams.
        srv.timeout(req, 0);

        let timer: ReturnType<typeof setInterval> | undefined;
        // start는 스트림이 만들어질 때 한 번 불린다. 여기서 타이머를 건다
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            let n = 0;
            timer = setInterval(() => {
              n += 1;
              // SSE 한 건 = 'data: 내용' 줄 + 빈 줄 하나
              controller.enqueue(
                enc.encode(`data: ${JSON.stringify({ n, t: Date.now() })}\n\n`),
              );
              if (n >= 10) {
                clearInterval(timer);
                // FIXED: when a server just ends the stream, EventSource
                // RECONNECTS after ~3 s and the count starts again from 1. A named
                // final event lets the page call es.close() (see the script above).
                controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
                controller.close();
              }
            }, 500);
          },
          // 클라이언트가 끊으면 불린다. 타이머를 안 치우면 혼자 계속 돈다
          cancel() {
            if (timer) clearInterval(timer);
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`24 sse → ${server.url}`);
    push("24", server);

}


// ========== [25] 25_auth.ts ==========
// Level: Intermediate. Bearer token guard.
// The pattern "return a Response to stop, or null to continue" composes
// well with `??`: requireBearer(...) ?? realHandler().
async function start25() {
  // 25. Bearer 토큰 인증 가드
  // 실행: bun --hot 25_auth.ts
  // 확인:
  //   curl -i http://localhost:3025/public
  //   curl -i http://localhost:3025/admin
  //   curl -i http://localhost:3025/admin -H 'Authorization: Bearer s3cret'

  const TOKEN = "s3cret";

  // FIXED (was: `auth === \`Bearer ${token}\``, a timing leak).
  // Both strings are HMAC-ed with a random per-process key, then compared
  // with a loop that always visits every byte. The time no longer depends
  // on how many leading characters were right, nor on the token length.
  const MAC_KEY = crypto.getRandomValues(new Uint8Array(32));
  const mac = (s: string) => new Bun.CryptoHasher("sha256", MAC_KEY).update(s).digest();

  function requireBearer(req: Request, token: string): Response | null {
    const auth = req.headers.get("authorization") ?? "";
    const a = mac(auth);
    const b = mac(`Bearer ${token}`);
    let diff = 0;
    // 다른 바이트가 하나라도 있으면 diff가 0이 아니게 된다. 중간에 안 멈추고 끝까지 도는 게 요점
    for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
    if (diff === 0) return null; // 통과
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    });
  }

  const server = Bun.serve({
    port: 3025,
    routes: {
      "/": () =>
        new Response(
          "GET /public (공개) | GET /admin (Bearer s3cret 필요)\n",
        ),
      "/public": () => Response.json({ message: "누구나 볼 수 있음" }),
      "/admin": (req) =>
        requireBearer(req, TOKEN) ??
        Response.json({ secret: 42, message: "인증 성공" }),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`25 auth → ${server.url}`);
    push("25", server);

}


// ========== [26] 26_middleware.ts ==========
// Level: Intermediate. Middleware without a framework.
// A middleware is (req, next) => Promise<Response>: it can act before
// next(), after next(), or not call next() at all (e.g. auth failure).
async function start26() {
  // 26. 미들웨어 합성 — 로깅 · 타이밍 · 헤더 (프레임워크 없이)
  // 실행: bun --hot 26_middleware.ts
  // 확인: curl -i http://localhost:3026/api/hello

  type Mw = (
    req: Request,
    next: () => Promise<Response>,
  ) => Promise<Response>;

  const withLog: Mw = async (req, next) => {
    const t = performance.now();
    const res = await next();
    const ms = (performance.now() - t).toFixed(1);
    console.log(`${req.method} ${new URL(req.url).pathname} ${res.status} ${ms}ms`);
    return res;
  };

  const withRequestId: Mw = async (req, next) => {
    const id = crypto.randomUUID().slice(0, 8);
    const res = await next();
    const headers = new Headers(res.headers);
    headers.set("X-Request-Id", id);
    // Headers of some Responses are immutable (e.g. ones from fetch()), so a
    // copy is made. Passing res.body re-uses the body stream without reading
    // it into memory.
    return new Response(res.body, { status: res.status, headers });
  };

  // reduceRight wraps the handler from the inside out, so compose([a, b], h)
  // runs a -> b -> h -> b -> a (the "onion"). withLog is outermost and
  // therefore also measures withRequestId's time.
  const compose =
    (mws: Mw[], handler: (req: Request) => Promise<Response>) =>
    (req: Request) =>
      mws.reduceRight<() => Promise<Response>>(
        (next, mw) => () => mw(req, next),
        () => handler(req),
      )();

  const handler = async (req: Request) => {
    const url = new URL(req.url);
    if (url.pathname === "/api/hello") {
      await Bun.sleep(5); // 처리 지연 흉내
      return Response.json({ message: "middleware ok" });
    }
    return new Response("Not Found", { status: 404 });
  };

  const server = Bun.serve({
    port: 3026,
    fetch: compose([withLog, withRequestId], handler),
  });

  console.log(`26 middleware → ${server.url}`);
    push("26", server);

}


// ========== [27] 27_static_dir.ts ==========
// Level: Intermediate. Serving a directory by hand.
async function start27() {
  // 27. 정적 디렉터리 서버 — 경로 이탈(..) 방지
  // 실행: bun --hot 27_static_dir.ts
  // 확인:
  //   curl http://localhost:3027/
  //   curl http://localhost:3027/about.html
  //   curl http://localhost:3027/%2e%2e/secret.txt     # 400 (.. 인코딩)

  const PUBLIC = `${BASE_DIR}/_public`;

  await Bun.write(
    `${PUBLIC}/index.html`,
    `<!DOCTYPE html><html lang="ko"><body><h1>Public</h1><a href="/about.html">about</a></body></html>\n`,
  );
  await Bun.write(
    `${PUBLIC}/about.html`,
    `<!DOCTYPE html><html lang="ko"><body><h1>About</h1></body></html>\n`,
  );
  await Bun.write(`${PUBLIC}/hello.txt`, "static dir ok\n");

  const server = Bun.serve({
    port: 3027,
    async fetch(req) {
      const url = new URL(req.url);
      // FIXED (was: a malformed escape like /%E0%A4%A -> URIError -> 500 with
      // Bun's development error page). decodeURIComponent is now in try/catch.
      // new URL() has already resolved "/../" and "/%2e%2e/" segments, so the
      // ".." check is a second line of defense. Hidden files are refused too:
      // no path segment may start with "." (/.env, /.git/config).
      // Bun 1.4.3+ can do this natively: routes: { "/static/*": { dir } }.
      let rel: string;
      try {
        rel = decodeURIComponent(url.pathname.slice(1)) || "index.html";
      } catch {
        return new Response("Bad path", { status: 400 });
      }

      if (rel.includes("..") || rel.includes("\0") || rel.split("/").some((seg) => seg.startsWith("."))) {
        return new Response("Bad path", { status: 400 });
      }

      const file = Bun.file(`${PUBLIC}/${rel}`);
      if (await file.exists()) return new Response(file);
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`27 static_dir → ${server.url}`);
    push("27", server);

}


// ========== [28] 28_stream.ts ==========
// Level: Intermediate. Streaming a response.
// With a ReadableStream body, Bun sends each enqueued chunk as soon as it
// exists (Transfer-Encoding: chunked); use `curl -N` to see it arrive.
async function start28() {
  // 28. ReadableStream 응답 — 청크 스트리밍
  // 실행: bun --hot 28_stream.ts
  // 확인: curl -N http://localhost:3028/stream

  const server = Bun.serve({
    port: 3028,
    routes: {
      "/": () => new Response("GET /stream 으로 청크 스트림을 받아보세요"),
      "/stream": () => {
        // start() pushes everything regardless of how fast the client reads.
        // For large or endless data use pull(), which the runtime calls only when
        // the consumer wants more (backpressure); see [41].
        const stream = new ReadableStream({
          async start(controller) {
            const enc = new TextEncoder();
            for (const chunk of ["하나\n", "둘\n", "셋\n", "끝\n"]) {
              controller.enqueue(enc.encode(chunk));
              await Bun.sleep(200);
            }
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`28 stream → ${server.url}`);
    push("28", server);

}


// ========== [29] 29_ws_pubsub.ts ==========
// Level: Intermediate. WebSocket rooms with pub/sub.
// ws.subscribe(topic) joins a topic; server.publish(topic, msg) sends to
// every subscriber from native code, with no JS loop over sockets.
// ws.data (set in upgrade()) holds per-connection state.
async function start29() {
  // 29. WebSocket Pub/Sub — 방(room) 채팅
  // 실행: bun --hot 29_ws_pubsub.ts
  // 확인: 브라우저 http://localhost:3029/?user=ada&room=lobby
  //       다른 탭에서 ?user=bob&room=lobby

  type WsData = { username: string; room: string };

  const html = `<!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>WS Pub/Sub</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 2rem; max-width: 40rem; }
      #log { height: 16rem; overflow: auto; background: #f4f4f5; padding: 1rem; white-space: pre-wrap; }
      .row { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
      input { flex: 1; padding: 0.5rem; }
    </style>
  </head>
  <body>
    <h1>Room Chat</h1>
    <p id="meta"></p>
    <pre id="log"></pre>
    <div class="row">
      <input id="msg" placeholder="메시지" />
      <button id="send">보내기</button>
    </div>
    <script>
      const q = new URLSearchParams(location.search);
      const room = q.get("room") || "lobby";
      const user = q.get("user") || "anon";
      document.getElementById("meta").textContent = user + " @ " + room;
      const log = document.getElementById("log");
      const ws = new WebSocket("ws://" + location.host + "/ws?room=" + encodeURIComponent(room) + "&user=" + encodeURIComponent(user));
      ws.onmessage = (e) => { log.textContent += e.data + "\\n"; log.scrollTop = log.scrollHeight; };
      document.getElementById("send").onclick = () => {
        const v = document.getElementById("msg").value;
        if (!v) return;
        ws.send(v);
        document.getElementById("msg").value = "";
      };
    </script>
  </body>
  </html>`;

  const server = Bun.serve({
    port: 3029,
    routes: {
      "/": () =>
        new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      "/stats": (_req, srv) =>
        Response.json({
          // 그 토픽을 구독 중인 소켓 수
          lobby: srv.subscriberCount("lobby"),
          pendingWebSockets: srv.pendingWebSockets,
        }),
    },
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        // 여기 넣은 data가 그 소켓의 ws.data로 계속 따라다닌다
        const ok = srv.upgrade(req, {
          data: {
            username: url.searchParams.get("user") ?? "anon",
            room: url.searchParams.get("room") ?? "lobby",
          } satisfies WsData,
        });
        return ok ? undefined : new Response("Upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      // 실제 값이 아니라 ws.data의 타입을 알려 주는 자리
      data: {} as WsData,
      open(ws) {
        ws.subscribe(ws.data.room);
        // server.publish → 토픽 구독자 전원
        // `server` is the const being initialized by Bun.serve(...). Using it
        // inside a handler is fine because handlers run later, after it exists.
        // user and room come straight from the query string with no auth: anyone
        // can join any room under any name ([69] has the same issue).
        server.publish(ws.data.room, `* ${ws.data.username} joined`);
      },
      message(ws, message) {
        server.publish(ws.data.room, `${ws.data.username}: ${message}`);
      },
      close(ws) {
        // Verified on 1.4.4: a closed socket leaves all its topics automatically,
        // so this line is harmless but not required.
        ws.unsubscribe(ws.data.room);
        server.publish(ws.data.room, `* ${ws.data.username} left`);
      },
    },
  });

  console.log(`29 ws_pubsub → ${server.url}?user=ada&room=lobby`);
    push("29", server);

}


// ========== [30] 30_crud.ts ==========
// Level: Intermediate. REST CRUD on a Map.
// PUT replaces the whole item (all fields required); PATCH changes only
// the fields sent; DELETE answers 204 No Content.
async function start30() {
  // 30. REST CRUD — GET/POST/PUT/PATCH/DELETE
  // 실행: bun --hot 30_crud.ts
  // 확인:
  //   curl http://localhost:3030/api/items
  //   curl -X POST http://localhost:3030/api/items -H 'Content-Type: application/json' -d '{"name":"pen"}'
  //   curl -X PUT http://localhost:3030/api/items/1 -H 'Content-Type: application/json' -d '{"name":"pencil","qty":10}'
  //   curl -X PATCH http://localhost:3030/api/items/1 -H 'Content-Type: application/json' -d '{"qty":3}'
  //   curl -X DELETE http://localhost:3030/api/items/1

  type Item = { id: string; name: string; qty: number };

  const items = new Map<string, Item>([
    ["1", { id: "1", name: "notebook", qty: 2 }],
  ]);

  // FIXED (was: invalid JSON -> 500, qty never type-checked).
  // readBody() returns either the parsed object or a ready 400 Response;
  // `if (body instanceof Response) return body;` keeps handlers flat.
  async function readBody(req: Request): Promise<{ name?: unknown; qty?: unknown } | Response> {
    try {
      const v = (await req.json()) as unknown;
      // null, 배열, 숫자도 JSON으로는 맞는 값이라 객체인지 따로 확인
      if (v && typeof v === "object" && !Array.isArray(v)) return v as { name?: unknown; qty?: unknown };
      return Response.json({ error: "body must be a JSON object" }, { status: 400 });
    } catch {
      return Response.json({ error: "invalid JSON" }, { status: 400 });
    }
  }
  // v is string: true를 돌려주면 그 뒤로 TS가 v를 string으로 본다
  const isName = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
  const isQty = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

  const server = Bun.serve({
    port: 3030,
    routes: {
      "/api/items": {
        GET: () => Response.json([...items.values()]),
        POST: async (req) => {
          const body = await readBody(req);
          if (body instanceof Response) return body;
          if (!isName(body.name)) {
            return Response.json({ error: "name required" }, { status: 400 });
          }
          if (body.qty !== undefined && !isQty(body.qty)) {
            return Response.json({ error: "qty must be an integer >= 0" }, { status: 400 });
          }
          const item: Item = {
            id: crypto.randomUUID().slice(0, 8),
            name: body.name.trim(),
            qty: (body.qty as number | undefined) ?? 1,
          };
          items.set(item.id, item);
          return Response.json(item, { status: 201 });
        },
      },
      "/api/items/:id": {
        GET: (req) => {
          const item = items.get(req.params.id);
          if (!item) return new Response("Not Found", { status: 404 });
          return Response.json(item);
        },
        PUT: async (req) => {
          if (!items.has(req.params.id)) {
            return new Response("Not Found", { status: 404 });
          }
          const body = await readBody(req);
          if (body instanceof Response) return body;
          if (!isName(body.name) || !isQty(body.qty)) {
            return Response.json(
              { error: "name and qty required" },
              { status: 400 },
            );
          }
          const item: Item = {
            id: req.params.id,
            name: body.name.trim(),
            qty: body.qty,
          };
          items.set(item.id, item);
          return Response.json(item);
        },
        PATCH: async (req) => {
          const cur = items.get(req.params.id);
          if (!cur) return new Response("Not Found", { status: 404 });
          const body = await readBody(req);
          if (body instanceof Response) return body;
          if (body.name !== undefined && !isName(body.name)) {
            return Response.json({ error: "name must be a non-empty string" }, { status: 400 });
          }
          if (body.qty !== undefined && !isQty(body.qty)) {
            return Response.json({ error: "qty must be an integer >= 0" }, { status: 400 });
          }
          // 보낸 필드만 덮어쓰고 나머지는 기존 값 그대로
          const next: Item = {
            ...cur,
            ...(body.name !== undefined ? { name: (body.name as string).trim() } : {}),
            ...(body.qty !== undefined ? { qty: body.qty as number } : {}),
          };
          items.set(next.id, next);
          return Response.json(next);
        },
        DELETE: (req) => {
          if (!items.delete(req.params.id)) {
            return new Response("Not Found", { status: 404 });
          }
          return new Response(null, { status: 204 });
        },
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`30 crud → ${server.url}`);
    push("30", server);

}


// ========== [31] 31_sqlite.ts ==========
// ★ RELATED — official sample "PostgreSQL" uses Bun.sql, the newer API for Postgres/MySQL/SQLite: [50].
// Level: Intermediate. REST over bun:sqlite.
// bun:sqlite is SQLite compiled into Bun with a synchronous API. db.query()
// compiles SQL once and caches the prepared statement. `?` placeholders
// bind values safely: user input is never pasted into SQL text.
async function start31() {
  // 31. SQLite REST — bun:sqlite (내장, npm 패키지 아님)
  // 실행: bun --hot 31_sqlite.ts
  // 확인:
  //   curl http://localhost:3031/api/posts
  //   curl -X POST http://localhost:3031/api/posts \
  //     -H 'Content-Type: application/json' \
  //     -d '{"title":"hello","content":"world"}'
  //   curl http://localhost:3031/api/posts/<id>

  const dbPath = `${BASE_DIR}/_data/posts.db`;
  await Bun.write(`${BASE_DIR}/_data/.keep`, "");

  // A file database persists across runs (_data/posts.db keeps growing).
  // For concurrent readers run db.exec("PRAGMA journal_mode = WAL") once.
  // ISO-8601 strings sort correctly as text, so ORDER BY created_at works.
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const listPosts = db.query("SELECT * FROM posts ORDER BY created_at DESC");
  const getPost = db.query("SELECT * FROM posts WHERE id = ?");
  const insertPost = db.query(
    `INSERT INTO posts (id, title, content, created_at) VALUES (?, ?, ?, ?)`,
  );
  const deletePost = db.query("DELETE FROM posts WHERE id = ?");

  const server = Bun.serve({
    port: 3031,
    routes: {
      "/api/posts": {
        // all()은 행 배열, get()은 첫 행 하나(없으면 null)
        GET: () => Response.json(listPosts.all()),
        POST: async (req) => {
          const body = (await req.json()) as { title?: string; content?: string };
          if (!body.title?.trim() || !body.content?.trim()) {
            return Response.json(
              { error: "title and content required" },
              { status: 400 },
            );
          }
          const id = crypto.randomUUID();
          const created_at = new Date().toISOString();
          insertPost.run(id, body.title.trim(), body.content.trim(), created_at);
          return Response.json(
            { id, title: body.title.trim(), content: body.content.trim(), created_at },
            { status: 201 },
          );
        },
      },
      "/api/posts/:id": {
        GET: (req) => {
          const post = getPost.get(req.params.id);
          if (!post) return new Response("Not Found", { status: 404 });
          return Response.json(post);
        },
        DELETE: (req) => {
          const r = deletePost.run(req.params.id);
          // changes는 실제로 바뀐 행 수. 0이면 그런 id가 없었다는 뜻
          if (r.changes === 0) return new Response("Not Found", { status: 404 });
          return new Response(null, { status: 204 });
        },
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
    error(err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  console.log(`31 sqlite → ${server.url} (db: ${dbPath})`);
    push("31", server);

}


// ========== [32] 32_sqlite_354.ts ==========
// NEW in Bun 1.4.5 edition.
async function start32() {
  // Level: Intermediate. SQLite 3.54: safe schema changes, and an authorizer
  // for queries you did not write.
  // Bun 1.4.5 updates its bundled SQLite from 3.53.4 to 3.54.1 (used by both
  // bun:sqlite and node:sqlite). Two 3.54 changes can break existing code:
  //  1. ALTER TABLE can no longer ADD, RENAME or DROP a column named rowid,
  //     oid or _rowid_. Every ordinary table has a hidden 64-bit row id
  //     reachable under those three names; a real column with that name
  //     hides it, which is a classic source of bugs. What to do: never use
  //     those names, declare `id INTEGER PRIMARY KEY` (it BECOMES the row
  //     id), and check column names before ALTER TABLE, so the API answers
  //     the same 422 on every SQLite version (POST /columns). GET / tries the
  //     raw ALTER TABLE and shows what this SQLite really does.
  //  2. The authorizer is now also asked about functions used in DEFAULT
  //     expressions, such as `created TEXT DEFAULT (datetime('now'))`. An
  //     allow-list that forgot datetime makes an INSERT fail where it used
  //     to work (GET /authorizer).
  // On macOS Bun uses the SYSTEM SQLite unless SQLITE_LIB (top of the file)
  // switched to Homebrew's, so these rules apply there only when the library
  // in use is 3.54 or newer. Every answer includes the version.
  //
  // What an authorizer is: while SQLite COMPILES a statement it calls
  // fn(action, arg1, arg2, dbName, trigger) for every operation it is about
  // to do (SELECT, READ table.column, FUNCTION name, INSERT, DELETE ...).
  // Returning constants.SQLITE_DENY makes prepare() throw "not authorized".
  // That makes it the right guard when users may send their own SELECT (a
  // report builder): allow SELECT, reading the allowed tables and a short
  // list of functions, deny everything else, including recursive CTEs that
  // could loop forever. It is a second wall, not a replacement for a
  // read-only database file and a row limit.
  // bun:sqlite has no authorizer; node:sqlite (Node's API, built into Bun
  // too) has db.setAuthorizer(fn). This example uses both.
  // Try:
  //   curl localhost:3032/
  //   curl -X POST localhost:3032/columns -H 'Content-Type: application/json' -d '{"name":"rowid"}'
  //   curl -X POST localhost:3032/columns -H 'Content-Type: application/json' -d '{"name":"note"}'
  //   curl -X POST localhost:3032/report -H 'Content-Type: application/json' \
  //     -d '{"sql":"SELECT name, upper(name) AS shout, price FROM products"}'
  //   curl -X POST localhost:3032/report -H 'Content-Type: application/json' -d '{"sql":"SELECT * FROM users"}'
  //   curl -X POST localhost:3032/report -H 'Content-Type: application/json' -d '{"sql":"DELETE FROM products"}'
  //   curl localhost:3032/authorizer

  const { DatabaseSync, constants: SQ } = await import("node:sqlite");
  const RESERVED = new Set(["rowid", "oid", "_rowid_"]);
  const SEED: [string, number][] = [["apple", 3], ["bread", 5], ["cheese", 9]];

  // --- 1. bun:sqlite: the schema we change through the API -----------------
  const db = new Database(":memory:");
  db.exec("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL)");
  const insertProduct = db.query("INSERT INTO products (name, price) VALUES (?, ?)");
  for (const [name, price] of SEED) insertProduct.run(name, price);
  const sqliteVersion = (db.query("SELECT sqlite_version() AS v").get() as { v: string }).v;
  const rules354 = Bun.semver.satisfies(sqliteVersion, ">=3.54.0");
  // PRAGMA table_info: 테이블의 컬럼 목록을 돌려주는 SQLite 명령
  const columns = () => (db.query("PRAGMA table_info(products)").all() as { name: string }[]).map((c) => c.name);

  // What THIS SQLite does with the raw statement, on a scratch table.
  function rawAlter(): { refused: boolean; error: string | null } {
    const scratch = new Database(":memory:");
    try {
      scratch.exec("CREATE TABLE t (a TEXT)");
      scratch.exec("ALTER TABLE t ADD COLUMN rowid TEXT");
      return { refused: false, error: null };
    } catch (err) {
      return { refused: true, error: (err as Error).message };
    } finally {
      scratch.close();
    }
  }

  // --- 2. node:sqlite: a report database guarded by an authorizer ----------
  const reports = new DatabaseSync(":memory:");
  reports.exec(`
    CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL);
    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL);
    INSERT INTO users (email, password_hash) VALUES ('ada@example.com', '$argon2id$not-for-you');
  `);
  const seedReports = reports.prepare("INSERT INTO products (name, price) VALUES (?, ?)");
  for (const [name, price] of SEED) seedReports.run(name, price);
  // Set the authorizer AFTER the setup above: it applies to every later
  // prepare() on this connection, including our own.
  const READABLE = new Set(["products"]);
  const FUNCTIONS = new Set(["upper", "lower", "length", "round", "abs", "count", "sum", "avg", "min", "max", "coalesce"]);
  reports.setAuthorizer((action: number, arg1: string | null, arg2: string | null) => {
    switch (action) {
      case SQ.SQLITE_SELECT:
        return SQ.SQLITE_OK;
      case SQ.SQLITE_READ: // arg1 = table, arg2 = column
        return arg1 !== null && READABLE.has(arg1) ? SQ.SQLITE_OK : SQ.SQLITE_DENY;
      case SQ.SQLITE_FUNCTION: // arg2 = function name
        return arg2 !== null && FUNCTIONS.has(arg2.toLowerCase()) ? SQ.SQLITE_OK : SQ.SQLITE_DENY;
      default: // INSERT, UPDATE, DELETE, PRAGMA, ATTACH, RECURSIVE, ...
        return SQ.SQLITE_DENY;
    }
  });

  const server = Bun.serve({
    port: 3032,
    routes: {
      "/": () =>
        Response.json({
          sqlite: sqliteVersion,
          source: SQLITE_SOURCE,
          rules354,
          rawAlterAddRowid: rawAlter(), // refused: true on 3.54+
          columns: columns(),
        }),
      "/columns": {
        GET: () => Response.json({ columns: columns() }),
        POST: async (req) => {
          const body = (await readJsonCapped(req, 1024)) as { name?: unknown };
          const name = typeof body.name === "string" ? body.name : "";
          // An identifier cannot be a ? placeholder, so it must be checked
          // against a strict pattern before it goes into the SQL text.
          if (!/^[A-Za-z_][A-Za-z0-9_]{0,30}$/.test(name)) throw new HttpError(422, "name: letters, digits and _, max 31 characters");
          if (RESERVED.has(name.toLowerCase())) {
            throw new HttpError(422, `"${name}" is reserved: it would hide the table's row id (SQLite 3.54+ refuses it anyway)`);
          }
          const existing = columns();
          if (existing.some((c) => c.toLowerCase() === name.toLowerCase())) throw new HttpError(409, `column "${name}" already exists`);
          if (existing.length >= 16) throw new HttpError(409, "this demo table is full (16 columns): restart allblue.ts");
          // 위에서 이름을 검사했으니 SQL 문자열에 직접 넣어도 된다
          db.exec(`ALTER TABLE products ADD COLUMN "${name}" TEXT`);
          return Response.json({ added: name, columns: columns() }, { status: 201 });
        },
      },
      "/report": {
        POST: async (req) => {
          const body = (await readJsonCapped(req, 4096)) as { sql?: unknown };
          if (typeof body.sql !== "string" || body.sql.length > 1000) throw new HttpError(422, "sql: a string of at most 1000 characters");
          let stmt;
          try {
            stmt = reports.prepare(body.sql); // the authorizer runs HERE
          } catch (err) {
            // A denied READ fails with errcode 23 (SQLITE_AUTH, "access to
            // users.email is prohibited"); a denied FUNCTION or statement
            // with errcode 1 and "not authorized". Both are the user's
            // fault, but a 403, not a syntax error.
            const { message, errcode } = err as Error & { errcode?: number };
            const denied = errcode === 23 || /not authorized|prohibited/.test(message);
            throw new HttpError(denied ? 403 : 400, message);
          }
          const rows = stmt.all().slice(0, 100); // and a row limit on top
          return Response.json({ rows, count: rows.length });
        },
      },
      "/authorizer": () => {
        // Change 2: is datetime() in a DEFAULT expression shown to the authorizer?
        const scratch = new DatabaseSync(":memory:");
        scratch.exec("CREATE TABLE events (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, created TEXT NOT NULL DEFAULT (datetime('now')))");
        const nodeSqlite = (scratch.prepare("SELECT sqlite_version() AS v").get() as { v: string }).v;
        const asked: string[] = [];
        scratch.setAuthorizer((action: number, _arg1: string | null, arg2: string | null) => {
          if (action !== SQ.SQLITE_FUNCTION) return SQ.SQLITE_OK;
          asked.push(String(arg2));
          return arg2 === "datetime" ? SQ.SQLITE_DENY : SQ.SQLITE_OK; // an allow-list that forgot datetime
        });
        let insert = "ok";
        try {
          scratch.prepare("INSERT INTO events (kind) VALUES (?)").run("signup"); // no function in OUR SQL
        } catch (err) {
          insert = `denied: ${(err as Error).message}`;
        }
        scratch.close();
        const is354 = Bun.semver.satisfies(nodeSqlite, ">=3.54.0");
        return Response.json({
          sqlite: nodeSqlite,
          rules354: is354,
          functionsAsked: asked,
          insert,
          why: is354
            ? "SQLite 3.54+ asks the authorizer about datetime() in the DEFAULT, so this allow-list blocks the INSERT"
            : "before SQLite 3.54 functions in DEFAULT expressions skip the authorizer, so the INSERT works",
        });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`32 sqlite_354 → ${server.url}  (SQLite ${sqliteVersion}${rules354 ? "" : ", 3.54 rules not active"})`);
  register("32", {
    url: server.url,
    stop: async (force?: boolean) => {
      await server.stop(force); // let in-flight requests finish first
      db.close();
      reports.close();
    },
  });
}


// ========== [33] 33_metrics.ts ==========
// Level: Intermediate. Server introspection.
// pendingRequests / pendingWebSockets / subscriberCount() are live counters
// kept by the native server; cheap enough for a /metrics endpoint.
async function start33() {
  // 33. 메트릭 · requestIP · Server API
  // 실행: bun --hot 33_metrics.ts
  // 확인:
  //   curl http://localhost:3033/whoami
  //   curl http://localhost:3033/metrics

  const server = Bun.serve({
    port: 3033,
    routes: {
      "/": () =>
        new Response("GET /whoami | GET /metrics | WS /ws (메트릭용)\n"),
      "/whoami": (req, srv) => {
        // This is the TCP peer. Behind a reverse proxy it is the proxy's address;
        // read X-Forwarded-For only when the request really came from your proxy.
        const ip = srv.requestIP(req);
        return Response.json({
          ip: ip?.address ?? null,
          family: ip?.family ?? null,
          port: ip?.port ?? null,
        });
      },
      "/metrics": (_req, srv) =>
        Response.json({
          // 지금 처리 중인 요청 수 (이 요청 자신도 포함)
          pendingRequests: srv.pendingRequests,
          pendingWebSockets: srv.pendingWebSockets,
          hostname: srv.hostname,
          port: srv.port,
          url: String(srv.url),
          topicDemo: srv.subscriberCount("demo"),
        }),
    },
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        if (srv.upgrade(req)) return undefined as never;
        return new Response("Upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      open(ws) {
        ws.subscribe("demo");
      },
      // 메시지는 안 쓰지만 message 핸들러는 꼭 있어야 한다
      message() {},
      close(ws) {
        ws.unsubscribe("demo");
      },
    },
  });

  console.log(`33 metrics → ${server.url}`);
    push("33", server);

}


// ========== [34] 34_ratelimit.ts ==========
// Level: Intermediate. Fixed-window rate limiting.
// Each IP gets LIMIT requests per WINDOW_MS; then 429 + Retry-After.
async function start34() {
  // 34. Rate limit — IP 기준 고정 윈도우 (인메모리)
  // 실행: bun --hot 34_ratelimit.ts
  // 확인: for i in $(seq 1 8); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3034/; done
  //       (LIMIT=5 → 앞 5개는 200, 이후 429)

  // FIXED (was: entries were never removed, so memory grew with every
  // distinct IP). Expired entries are now swept at most once per window,
  // lazily, inside rateLimit(): no timer needed.
  // A fixed window still allows a burst of 2 x LIMIT across a window
  // boundary; a token bucket ([73]) smooths that. State is per process.
  const hits = new Map<string, { count: number; resetAt: number }>();
  const LIMIT = 5;
  const WINDOW_MS = 10_000;
  let nextSweep = Date.now() + WINDOW_MS;

  function rateLimit(ip: string): { ok: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    if (now >= nextSweep) {
      for (const [key, r] of hits) if (now > r.resetAt) hits.delete(key);
      nextSweep = now + WINDOW_MS;
    }
    let rec = hits.get(ip);
    // 처음 온 IP거나 창이 지났으면 카운트를 0부터 다시
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + WINDOW_MS };
      hits.set(ip, rec);
    }
    if (rec.count >= LIMIT) {
      return { ok: false, remaining: 0, resetAt: rec.resetAt };
    }
    rec.count++;
    return {
      ok: true,
      remaining: LIMIT - rec.count,
      resetAt: rec.resetAt,
    };
  }

  const server = Bun.serve({
    port: 3034,
    fetch(req, srv) {
      const ip = srv.requestIP(req)?.address ?? "unknown";
      const { ok, remaining, resetAt } = rateLimit(ip);
      // Retry-After: 몇 초 뒤에 다시 오라는 값 (초 단위)
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

      if (!ok) {
        return new Response("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(LIMIT),
            "X-RateLimit-Remaining": "0",
          },
        });
      }

      return Response.json(
        { ok: true, ip, remaining },
        {
          headers: {
            "X-RateLimit-Limit": String(LIMIT),
            "X-RateLimit-Remaining": String(remaining),
          },
        },
      );
    },
  });

  console.log(`34 ratelimit → ${server.url} (limit ${LIMIT}/${WINDOW_MS}ms)`);
    push("34", server);

}


// ========== [35] 35_graceful.ts ==========
// Level: Intermediate. Graceful shutdown.
// server.stop() stops accepting connections and resolves when in-flight
// requests are done; server.stop(true) cuts them off.
async function start35() {
  // 35. Graceful shutdown — SIGINT/SIGTERM → server.stop()
  // 실행: bun 35_graceful.ts
  // 확인:
  //   터미널1: bun 35_graceful.ts
  //   터미널2: curl http://localhost:3035/slow   # 0.8초 걸리는 요청
  //   터미널1: Ctrl+C  — in-flight 끝나면 종료

  const server = Bun.serve({
    port: 3035,
    routes: {
      "/": () => new Response("GET /slow 후 Ctrl+C 로 graceful stop 테스트"),
      "/slow": async () => {
        await Bun.sleep(800);
        return Response.json({ done: true, at: Date.now() });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  // FIXED: the standalone version's shutdown() function was left here
  // unused (the generator removed its process.on lines). It is gone; in
  // this merged file shutdownAll() at the bottom does the same for every
  // server:
  //   await server.stop();      // stop accepting, wait for in-flight /slow
  //   await server.stop(true);  // or cut in-flight requests off

  // [합본] SIGINT/SIGTERM 은 파일 하단 공통 shutdown 사용
  console.log(`35 graceful → ${server.url} (Ctrl+C)`);
    push("35", server);

}


// ========== [36] 36_range.ts ==========
// Level: Intermediate. Range requests by hand.
// Verified on 1.4.4: new Response(Bun.file(path)) already answers Range
// requests with 206 by itself. This manual version exists to show how it
// works: parse "bytes=start-end", slice the file lazily with
// file.slice(start, end), answer 206 + Content-Range, or 416 when invalid.
async function start36() {
  // 36. Range 요청 — Bun.file.slice (부분 다운로드 / 미디어 seek)
  // 실행: bun --hot 36_range.ts
  // 확인:
  //   curl -i http://localhost:3036/file
  //   curl -i -H 'Range: bytes=0-11' http://localhost:3036/file
  //   curl -i -H 'Range: bytes=12-' http://localhost:3036/file

  const FILE = `${BASE_DIR}/_data/range-demo.txt`;
  await Bun.write(
    FILE,
    "Hello Range!\nSecond line here.\nThird line end.\n",
  );

  const server = Bun.serve({
    port: 3036,
    routes: {
      "/": () =>
        new Response(
          "GET /file  (전체)\nGET /file  + Header Range: bytes=0-11\n",
        ),
      "/file": async (req) => {
        const file = Bun.file(FILE);
        const size = file.size;
        const range = req.headers.get("Range");

        if (!range) {
          return new Response(file, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Accept-Ranges": "bytes",
              "Content-Length": String(size),
            },
          });
        }

        // bytes=start-end | bytes=start- | bytes=-suffix
        // Multi-range requests ("bytes=0-1,5-6") are not supported: "1,5" becomes
        // NaN and the answer is 416.
        const raw = range.split("=").at(-1) ?? "0-";
        const [a, b] = raw.split("-");
        let start: number;
        let end: number;

        if (a === "") {
          // bytes=-N → 끝에서 N바이트
          const suffix = Number(b);
          start = Math.max(0, size - suffix);
          end = size;
        } else {
          start = Number(a);
          end = b === "" || b == null ? size : Number(b) + 1; // end inclusive → slice exclusive
        }

        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          start >= size ||
          end <= start
        ) {
          return new Response("Range Not Satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${size}` },
          });
        }

        end = Math.min(end, size);
        // slice는 바로 읽지 않는다. 보낼 때 그 구간만 디스크에서 읽는다
        const slice = file.slice(start, end);

        return new Response(slice, {
          status: 206,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Accept-Ranges": "bytes",
            // Content-Range의 끝 값은 포함 범위라 1을 뺀다
            "Content-Range": `bytes ${start}-${end - 1}/${size}`,
            "Content-Length": String(end - start),
          },
        });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`36 range → ${server.url}`);
    push("36", server);

}


// ========== [37] 37_session.ts ==========
// Level: Intermediate. Cookie sessions.
// The cookie holds only a random id; the data stays on the server.
async function start37() {
  // 37. 쿠키 세션 — 로그인 쿠키로 보호 라우트
  // 실행: bun --hot 37_session.ts
  // 확인:
  //   curl -i -c /tmp/s.txt -b /tmp/s.txt -X POST http://localhost:3037/login \
  //     -H 'Content-Type: application/json' -d '{"user":"ada"}'
  //   curl -i -c /tmp/s.txt -b /tmp/s.txt http://localhost:3037/me
  //   curl -i -c /tmp/s.txt -b /tmp/s.txt -X POST http://localhost:3037/logout
  //   curl -i -c /tmp/s.txt -b /tmp/s.txt http://localhost:3037/me

  type Session = { user: string; createdAt: number };

  // In memory: lost on restart and never expired on the server (maxAge only
  // tells the browser). Check createdAt on every request. Add secure: true
  // when served over HTTPS. A new sid on every login (done below) prevents
  // session fixation.
  const sessions = new Map<string, Session>();
  const SESSION_TTL_MS = 60 * 60 * 1000;

  const server = Bun.serve({
    port: 3037,
    routes: {
      "/": () =>
        new Response(
          "POST /login {user} → POST /logout → GET /me (세션 필요)\n",
        ),
      "/login": {
        POST: async (req) => {
          const body = (await req.json()) as { user?: string };
          if (!body.user?.trim()) {
            return Response.json({ error: "user required" }, { status: 400 });
          }
          const sid = crypto.randomUUID();
          sessions.set(sid, { user: body.user.trim(), createdAt: Date.now() });
          req.cookies.set("sid", sid, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60,
          });
          return Response.json({ ok: true, user: body.user.trim() });
        },
      },
      "/logout": {
        POST: (req) => {
          const sid = req.cookies.get("sid");
          if (sid) sessions.delete(sid);
          req.cookies.delete("sid", { path: "/" });
          return Response.json({ ok: true });
        },
      },
      "/me": (req) => {
        const sid = req.cookies.get("sid");
        let session = sid ? sessions.get(sid) : undefined;
        // FIXED: sessions now expire on the SERVER after 1 hour too (the
        // cookie's maxAge only asks the browser to forget it; a copied cookie
        // would otherwise work forever).
        if (session && Date.now() - session.createdAt > SESSION_TTL_MS) {
          sessions.delete(sid!);
          session = undefined;
        }
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return Response.json({ user: session.user, sid });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`37 session → ${server.url}`);
    push("37", server);

}


// ========== [38] 38_validation.ts ==========
async function start38() {
  // Level: Intermediate. Validating JSON input properly.
  // Status codes that tell the client exactly what went wrong:
  //   415 wrong Content-Type   413 body too big   400 not parseable JSON
  //   422 parsed, but the VALUES are wrong
  // The 422 lists EVERY problem at once ({field, message}), so a form can
  // show all errors in one round trip. Unknown fields are errors too: a
  // typo like "emial" silently ignored is a bug that hides.
  // The validator returns a fully typed object, so code after it never
  // touches `unknown` data again.
  // Try:
  //   curl -X POST localhost:3038/api/signup -H 'Content-Type: application/json' -d '{"email":"x","age":-1,"emial":1}'
  //   curl -X POST localhost:3038/api/signup -H 'Content-Type: application/json' -d '{"email":"a@b.co","name":"Ada","age":36}'

  type Signup = { email: string; name: string; age: number; tags: string[]; newsletter: boolean };

  function validateSignup(input: unknown): Signup {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new HttpError(422, "validation failed", [{ field: "", message: "body must be a JSON object" }]);
    }
    const o = input as Record<string, unknown>;
    const errors: Array<{ field: string; message: string }> = [];
    const allowed = ["email", "name", "age", "tags", "newsletter"];
    for (const k of Object.keys(o)) if (!allowed.includes(k)) errors.push({ field: k, message: "unknown field" });

    if (typeof o.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) errors.push({ field: "email", message: "a valid e-mail address" });
    if (typeof o.name !== "string" || !o.name.trim() || o.name.length > 50) errors.push({ field: "name", message: "1..50 characters" });
    if (!Number.isInteger(o.age) || (o.age as number) < 0 || (o.age as number) > 150) errors.push({ field: "age", message: "integer 0..150" });
    if (o.tags !== undefined && (!Array.isArray(o.tags) || o.tags.length > 5 || !o.tags.every((t) => typeof t === "string" && /^[a-z0-9-]{1,20}$/.test(t)))) {
      errors.push({ field: "tags", message: "up to 5 tags matching [a-z0-9-]{1,20}" });
    }
    if (o.newsletter !== undefined && typeof o.newsletter !== "boolean") errors.push({ field: "newsletter", message: "true or false" });
    if (errors.length) throw new HttpError(422, "validation failed", errors);

    return {
      email: (o.email as string).toLowerCase(),
      name: (o.name as string).trim(),
      age: o.age as number,
      tags: [...new Set((o.tags as string[] | undefined) ?? [])], // Set removes duplicates
      newsletter: (o.newsletter as boolean | undefined) ?? false,
    };
  }

  const server = Bun.serve({
    port: 3038,
    routes: {
      "/api/signup": {
        POST: async (req) => {
          const signup = validateSignup(await readJsonCapped(req, 16 * 1024));
          return Response.json({ created: signup }, { status: 201 });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`38 validation → ${server.url}`);
  register("38", server);
}


// ========== [39] 39_rest_paging_ifmatch.ts ==========
async function start39() {
  // Level: Intermediate. A REST API with the three things real APIs need.
  // 1. LOCATION on create: POST answers 201 with "Location: /api/notes/7",
  //    the URL of the new item.
  // 2. CURSOR PAGINATION: GET /api/notes?limit=2&cursor=<last id seen>
  //    returns { items, nextCursor }; nextCursor is null on the last page.
  //    Unlike OFFSET, the database jumps straight to the cursor via the
  //    primary key, and rows inserted meanwhile do not shift pages. We
  //    fetch limit + 1 rows: if the extra row exists, there is a next page.
  // 3. OPTIMISTIC CONCURRENCY: every note has a version, sent as its ETag.
  //    PATCH with "If-Match: \"3\"" succeeds only if the note is still
  //    version 3; otherwise 412 Precondition Failed. This prevents "lost
  //    updates" (two editors silently overwriting each other). The check is
  //    inside the SQL UPDATE (WHERE version = ?), so it is atomic.
  // SQLite runs in ":memory:" here, so data resets on restart. RETURNING *
  // gives back the written row in the same statement.
  // Try:
  //   curl 'localhost:3039/api/notes?limit=2'
  //   curl -i -X PATCH localhost:3039/api/notes/1 -H 'Content-Type: application/json' -H 'If-Match: "1"' -d '{"text":"edited"}'
  //   (run it twice: the second time you get 412)

  type NoteRow = { id: number; text: string; tags: string; version: number; updated_at: string };
  const db = new Database(":memory:", { strict: true }); // strict: bind { id } instead of { $id }
  // 끝의 STRICT: 컬럼 타입과 안 맞는 값을 넣으면 에러를 낸다
  db.run(`CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, tags TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL) STRICT`);
  const q = {
    // 제네릭 첫째는 결과 행 타입, 둘째는 바인딩할 파라미터 타입
    insert: db.query<NoteRow, { text: string; tags: string; now: string }>(
      `INSERT INTO notes (text, tags, version, updated_at) VALUES ($text, $tags, 1, $now) RETURNING *`,
    ),
    get: db.query<NoteRow, { id: number }>(`SELECT * FROM notes WHERE id = $id`),
    page: db.query<NoteRow, { cursor: number; limit: number; tag: string | null }>(
      // json_each() turns the tags JSON array into rows so we can filter by tag.
      `SELECT * FROM notes WHERE id > $cursor
         AND ($tag IS NULL OR EXISTS (SELECT 1 FROM json_each(notes.tags) WHERE value = $tag))
       ORDER BY id LIMIT $limit`,
    ),
    update: db.query<NoteRow, { id: number; version: number; text: string; tags: string; now: string }>(
      `UPDATE notes SET text = $text, tags = $tags, version = version + 1, updated_at = $now
       WHERE id = $id AND version = $version RETURNING *`,
    ),
    remove: db.query(`DELETE FROM notes WHERE id = $id`),
  };
  const toNote = (r: NoteRow) => ({ ...r, tags: JSON.parse(r.tags) as string[] });
  const etagOf = (r: { version: number }) => `"${r.version}"`;
  for (let i = 1; i <= 5; i++) q.insert.get({ text: `seed note ${i}`, tags: JSON.stringify(i % 2 ? ["odd"] : ["even"]), now: new Date().toISOString() });

  function parseBody(input: unknown, create: boolean) {
    const o = (input && typeof input === "object" && !Array.isArray(input) ? input : null) as Record<string, unknown> | null;
    if (!o) throw new HttpError(422, "validation failed", [{ field: "", message: "JSON object expected" }]);
    const errors: Array<{ field: string; message: string }> = [];
    if ((create || o.text !== undefined) && (typeof o.text !== "string" || !o.text.trim())) errors.push({ field: "text", message: "non-empty string" });
    if (o.tags !== undefined && (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === "string"))) errors.push({ field: "tags", message: "array of strings" });
    if (errors.length) throw new HttpError(422, "validation failed", errors);
    return { text: o.text as string | undefined, tags: o.tags as string[] | undefined };
  }
  function idOf(raw: string): number {
    if (!/^\d{1,12}$/.test(raw)) throw new HttpError(400, "id must be a positive integer");
    return Number(raw);
  }

  const server = Bun.serve({
    port: 3039,
    routes: {
      "/api/notes": {
        GET: (req) => {
          // 이상한 값이 와도 1~100 사이로 잘라서 쓴다
          const limit = Math.min(100, Math.max(1, Number(qp(req, "limit")) || 20));
          const cursor = Math.max(0, Number(qp(req, "cursor")) || 0);
          const rows = q.page.all({ cursor, limit: limit + 1, tag: qp(req, "tag") });
          const items = rows.slice(0, limit).map(toNote);
          return Response.json({ items, nextCursor: rows.length > limit ? items.at(-1)!.id : null });
        },
        POST: async (req) => {
          const b = parseBody(await readJsonCapped(req), true);
          const row = q.insert.get({ text: b.text!.trim(), tags: JSON.stringify(b.tags ?? []), now: new Date().toISOString() })!;
          return Response.json(toNote(row), { status: 201, headers: { Location: `/api/notes/${row.id}`, ETag: etagOf(row) } });
        },
      },
      "/api/notes/:id": {
        GET: (req) => {
          const row = q.get.get({ id: idOf(req.params.id) });
          if (!row) throw new HttpError(404, "note not found");
          return Response.json(toNote(row), { headers: { ETag: etagOf(row) } });
        },
        PATCH: async (req) => {
          const id = idOf(req.params.id);
          const b = parseBody(await readJsonCapped(req), false);
          const cur = q.get.get({ id });
          if (!cur) throw new HttpError(404, "note not found");
          const ifMatch = req.headers.get("if-match");
          // If-Match가 없으면 지금 버전으로 치고 그냥 덮어쓴다
          const expected = ifMatch === null ? cur.version : Number(ifMatch.replaceAll('"', ""));
          const row = q.update.get({ id, version: expected, text: b.text?.trim() ?? cur.text, tags: b.tags ? JSON.stringify(b.tags) : cur.tags, now: new Date().toISOString() });
          // 업데이트된 행이 없다 = 그 사이 누가 먼저 고쳐서 버전이 바뀌었다
          if (!row) throw new HttpError(412, `note is now version ${cur.version}, you sent If-Match ${ifMatch}; GET it again`);
          return Response.json(toNote(row), { headers: { ETag: etagOf(row) } });
        },
        DELETE: (req) => {
          const r = q.remove.run({ id: idOf(req.params.id) });
          if (r.changes === 0) throw new HttpError(404, "note not found");
          return new Response(null, { status: 204 });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`39 rest_paging_ifmatch → ${server.url}`);
  register("39", server);
}


// ========== [40] 40_etag_304.ts ==========
async function start40() {
  // Level: Intermediate. Conditional GET: ETag / If-None-Match and
  // Last-Modified / If-Modified-Since.
  // The server labels a response with a fingerprint (ETag) and a date.
  // A client that already has it asks "only if it changed":
  //   If-None-Match: "<etag>"          -> 304 Not Modified, empty body
  //   If-Modified-Since: <http date>   -> 304 if not modified since then
  // ETag wins when both are sent (it is exact; dates have 1 s resolution).
  // "Cache-Control: no-cache" does NOT mean "do not cache": it means
  // "store it, but revalidate every time", which is exactly this dance.
  // A 304 must still carry the ETag so the client can keep using it.
  // Try:
  //   curl -i localhost:3040/report             (note the ETag)
  //   curl -i localhost:3040/report -H 'If-None-Match: "<etag>"'   -> 304
  //   curl -X POST localhost:3040/report/bump    (changes the content)

  let version = 1;
  let body = "";
  let etag = "";
  let lastModified = new Date();
  function rebuild() {
    body = JSON.stringify({ version, generatedAt: new Date().toISOString(), rows: Array.from({ length: 50 }, (_, i) => i * version) });
    etag = `"${sha256hex(body).slice(0, 16)}"`; // strong ETag: byte-exact content id
    lastModified = new Date(Math.floor(Date.now() / 1000) * 1000); // HTTP dates have no milliseconds
  }
  rebuild();

  /** If-None-Match may hold a list ("a", "b") or "*", and weak tags (W/"a"). */
  function matches(header: string | null): boolean {
    if (!header) return false;
    if (header.trim() === "*") return true;
    return header.split(",").some((t) => t.trim().replace(/^W\//, "") === etag);
  }

  const server = Bun.serve({
    port: 3040,
    routes: {
      "/report": (req) => {
        const headers = { ETag: etag, "Last-Modified": lastModified.toUTCString(), "Cache-Control": "no-cache" };
        const inm = req.headers.get("if-none-match");
        if (inm !== null) {
          if (matches(inm)) return new Response(null, { status: 304, headers });
        } else {
          const ims = Date.parse(req.headers.get("if-modified-since") ?? "");
          if (Number.isFinite(ims) && lastModified.getTime() <= ims) return new Response(null, { status: 304, headers });
        }
        return new Response(body, { headers: { ...headers, "Content-Type": "application/json" } });
      },
      "/report/bump": {
        POST: () => {
          version++;
          rebuild();
          return Response.json({ version, etag });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`40 etag_304 → ${server.url}`);
  register("40", server);
}


// ========== [41] 41_ndjson_stream.ts ==========
async function start41() {
  // Level: Intermediate. Streaming a large result as NDJSON.
  // Response.json(bigArray) builds the WHOLE string in memory before the
  // first byte is sent. NDJSON (one JSON value per line) can be produced
  // and consumed row by row: the client handles row 1 while row 2000 is
  // still being read from the database.
  //   stmt.iterate()  yields one row at a time (no big array)
  //   pull()          is called only when the network wants more data
  //                   (backpressure), 200 rows per chunk
  // The statement is created with db.prepare() per export and finalized
  // at the end: an unfinished iterator keeps its statement busy, so two
  // exports sharing one cached statement would corrupt each other.
  // Reading it: see [78] (Bun's JSONL.parseChunk) or:
  //   curl -N localhost:3041/export.ndjson | head -3

  type Ev = { id: number; kind: string; at: string };
  const db = new Database(":memory:");
  db.run(`CREATE TABLE events (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, at TEXT NOT NULL)`);
  const ins = db.query(`INSERT INTO events (kind, at) VALUES (?, ?)`);
  // A transaction makes 2000 inserts one commit instead of 2000.
  // transaction()은 감싼 함수를 돌려준다. 끝의 ()가 실제 실행
  db.transaction(() => {
    for (let i = 0; i < 2000; i++) ins.run(["login", "click", "logout"][i % 3]!, new Date(1_700_000_000_000 + i * 1000).toISOString());
  })();

  function exportStream(): Response {
    const stmt = db.prepare<Ev, []>(`SELECT * FROM events ORDER BY id`);
    const rows = stmt.iterate();
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        let chunk = "";
        for (let i = 0; i < 200; i++) {
          const next = rows.next();
          if (next.done) {
            if (chunk) controller.enqueue(enc.encode(chunk));
            controller.close();
            stmt.finalize();
            return;
          }
          chunk += JSON.stringify(next.value) + "\n";
        }
        controller.enqueue(enc.encode(chunk));
      },
      cancel: () => stmt.finalize(), // client went away mid-export
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } });
  }

  const server = Bun.serve({
    port: 3041,
    routes: {
      "/export.ndjson": () => exportStream(),
      "/export.json": () => Response.json(db.query(`SELECT * FROM events ORDER BY id`).all()), // for comparison
      "/count": () => Response.json(db.query(`SELECT COUNT(*) AS n FROM events`).get()),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`41 ndjson_stream → ${server.url}`);
  register("41", server);
}


// ========== [42] 42_slow_flaky.ts ==========
async function start42() {
  // Level: Intermediate. Endpoints that misbehave on purpose, so clients
  // can practice timeouts, cancellation and retries ([78] uses them).
  // GET /slow?ms=2000
  //   Answers after ms. req.signal is an AbortSignal that Bun fires when
  //   the CLIENT disconnects (aborted, timed out, closed). Listening to it
  //   lets the server stop work nobody will receive. Verified on 1.4.4.
  //   /stats.aborted counts how often that happened.
  // GET /flaky?key=abc&fail=2
  //   The first `fail` calls with that key answer 503 + Retry-After, then
  //   200. 503 means "temporary, try again later". The key map is capped
  //   so it cannot be used to fill memory.
  // Try:
  //   curl -m 1 'localhost:3042/slow?ms=3000'; curl localhost:3042/stats
  //   for i in 1 2 3; do curl -s 'localhost:3042/flaky?key=k&fail=2'; echo; done

  const stats = { slow: 0, aborted: 0, flaky503: 0 };
  const counts = new Map<string, number>();

  const server = Bun.serve({
    port: 3042,
    routes: {
      "/slow": async (req) => {
        stats.slow++;
        const ms = Math.min(10_000, Math.max(0, Number(qp(req, "ms")) || 0));
        const aborted = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), ms);
          req.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              resolve(true);
            },
            // once: 한 번 불리면 리스너가 저절로 빠진다
            { once: true },
          );
        });
        if (aborted) stats.aborted++;
        return Response.json({ waitedMs: ms, aborted });
      },
      "/flaky": (req) => {
        const key = (qp(req, "key") ?? "default").slice(0, 64);
        const fail = Math.min(10, Math.max(0, Number(qp(req, "fail")) || 0));
        const n = (counts.get(key) ?? 0) + 1;
        counts.set(key, n);
        // Map은 넣은 순서를 기억해서 첫 키가 가장 오래된 키다
        if (counts.size > 1000) counts.delete(counts.keys().next().value!); // drop the oldest key
        if (n <= fail) {
          stats.flaky503++;
          return Response.json({ error: "temporarily unavailable", attempt: n }, { status: 503, headers: { "Retry-After": "0" } });
        }
        return Response.json({ ok: true, attempts: n });
      },
      "/stats": () => Response.json(stats),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`42 slow_flaky → ${server.url}`);
  register("42", server);
}


// ========== [43] 43_csrf.ts ==========
async function start43() {
  // Level: Intermediate. CSRF protection with Bun.CSRF.
  // Cross-Site Request Forgery: evil.com contains a form that POSTs to
  // your site; the browser attaches YOUR cookies, so the request looks
  // logged-in. Defenses, all used here:
  //   1. A CSRF token that evil.com cannot read: GET /form puts it in the
  //      page; POST /transfer must send it back. Bun.CSRF.generate(secret)
  //      makes a signed, expiring token; Bun.CSRF.verify(token, { secret })
  //      checks it. The secret includes the session id, so a token taken
  //      from another session does not work.
  //   2. SameSite=Strict on the session cookie: browsers do not send it
  //      on cross-site requests at all.
  //   3. An Origin check: browsers send the Origin header on POST; if it
  //      is present and not ours, refuse.
  // Verified on 1.4.4: Bun.CSRF.verify("") THROWS ("Token must be a
  // non-empty string") instead of returning false, so empty tokens are
  // rejected first.
  // Try: open http://localhost:3043/form in a browser and submit.

  const SECRET = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const secretFor = (sid: string) => `${SECRET}:${sid}`;

  function sessionOf(req: Bun.BunRequest): string {
    let sid = req.cookies.get("sid");
    if (!sid || !/^[0-9a-f-]{36}$/.test(sid)) {
      sid = Bun.randomUUIDv7();
      req.cookies.set("sid", sid, { httpOnly: true, sameSite: "strict", path: "/" });
    }
    return sid;
  }

  const server = Bun.serve({
    port: 3043,
    routes: {
      "/form": (req) => {
        const token = Bun.CSRF.generate(secretFor(sessionOf(req)), { expiresIn: 10 * 60 * 1000 });
        const html = `<!doctype html><meta charset="utf-8"><title>Transfer</title>
<form method="post" action="/transfer">
  <input name="amount" value="10"> <input type="hidden" name="csrf" value="${Bun.escapeHTML(token)}">
  <button>Send</button>
</form>`;
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      },
      // For JS clients: fetch the token as JSON, send it back in X-CSRF-Token.
      "/token": (req) => Response.json({ token: Bun.CSRF.generate(secretFor(sessionOf(req)), { expiresIn: 10 * 60 * 1000 }) }),
      "/transfer": {
        POST: async (req) => {
          const origin = req.headers.get("origin");
          if (origin !== null && origin !== server.url.origin) throw new HttpError(403, `cross-site request from ${origin}`);
          const sid = req.cookies.get("sid");
          if (!sid) throw new HttpError(403, "no session");
          const form = await req.formData();
          const token = String(form.get("csrf") ?? req.headers.get("x-csrf-token") ?? "");
          if (!token || !Bun.CSRF.verify(token, { secret: secretFor(sid) })) throw new HttpError(403, "invalid or expired CSRF token");
          const amount = Number(form.get("amount"));
          if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(422, "amount must be a positive number");
          return Response.json({ ok: true, transferred: amount });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`43 csrf → ${server.url}form`);
  register("43", server);
}


// ========== [44] 44_html_rewriter.ts ==========
async function start44() {
  // Level: Intermediate. HTMLRewriter: change or read HTML as a stream.
  // You register CSS selectors and handlers; the rewriter calls them while
  // the HTML streams through, without building a DOM. That makes it fast
  // and memory-light even for huge pages, and safe to use in a proxy.
  //   element(el)  attributes, remove(), before()/after()/prepend()/append()
  //   text(t)      text chunks; t.lastInTextNode marks the end of a node
  // Content inserted with { html: true } is parsed as HTML; without it,
  // it is escaped as text.
  // Try: curl localhost:3044/rewritten ; curl localhost:3044/extract

  const PAGE = `<!doctype html><html><head><title>Rewriter demo</title>
<script>console.log("tracking")</script></head>
<body><h1>Guide</h1>
<h2>Install</h2><p>See <a href="https://bun.com">Bun</a> and <a href="/local">local docs</a>.</p>
<h2>Run</h2><img src="http://example.com/x.png" alt="x">
</body></html>`;

  async function rewrite(): Promise<string> {
    return new HTMLRewriter()
      // void: 반환값을 버린다는 표시. 핸들러가 값을 돌려주지 않게 한다
      .on("script", { element: (el) => void el.remove() }) // drop scripts entirely
      .on("a[href^='http']", {
        element(el) {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        },
      })
      .on("img[src^='http:']", { element: (el) => void el.setAttribute("src", el.getAttribute("src")!.replace(/^http:/, "https:")) })
      .on("body", { element: (el) => void el.prepend(`<p class="banner">Rewritten by Bun ${Bun.version}</p>`, { html: true }) })
      .transform(new Response(PAGE))
      .text();
  }

  async function extract() {
    const out = { title: "", headings: [] as string[], links: [] as string[] };
    let heading = "";
    await new HTMLRewriter()
      .on("title", { text: (t) => void (out.title += t.text) })
      .on("h1, h2", {
        text(t) {
          heading += t.text;
          if (t.lastInTextNode) {
            out.headings.push(heading.trim());
            heading = "";
          }
        },
      })
      .on("a[href]", { element: (el) => void out.links.push(el.getAttribute("href")!) })
      .transform(new Response(PAGE))
      .arrayBuffer(); // consume the output so every handler runs
    return out;
  }

  const html = (body: string) => new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  const server = Bun.serve({
    port: 3044,
    routes: {
      "/original": () => html(PAGE),
      "/rewritten": async () => html(await rewrite()),
      "/extract": async () => Response.json(await extract()),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`44 html_rewriter → ${server.url}rewritten`);
  register("44", server);
}


// ========== [45] 45_cron.ts ==========
async function start45() {
  // Level: Intermediate. Scheduled work with Bun.cron.
  // Bun.cron(expr, fn) runs fn inside this process on a cron schedule
  // ("minute hour day month weekday"). The next run is computed only
  // after the previous one finished, so a slow job never overlaps itself.
  // It runs only while the process lives; for "even when the app is
  // down" Bun.cron(scriptPath, expr, name) registers with the OS
  // (launchd / crontab / Task Scheduler) instead.
  // Bun.cron.parse(expr, from?, { tz }) only CALCULATES the next time
  // (a Date, or null for impossible dates like Feb 30); it throws on
  // invalid expressions.
  // Keep the job function separate from the schedule, so it can also be
  // triggered by hand (POST /run-now) and tested.
  // Try:
  //   curl 'localhost:3045/next?expr=0%209%20*%20*%20MON-FRI&count=3&tz=Asia/Seoul'
  //   curl localhost:3045/status

  let runs = 0;
  let lastRun: string | null = null;
  async function cleanupJob() {
    runs++;
    lastRun = new Date().toISOString();
  }
  // 매 분 실행. 돌려받은 job으로 나중에 stop() 한다
  const job = Bun.cron("* * * * *", cleanupJob);

  const server = Bun.serve({
    port: 3045,
    routes: {
      "/status": () => Response.json({ schedule: job.cron, runs, lastRun, nextRun: Bun.cron.parse(job.cron)?.toISOString() ?? null }),
      "/run-now": {
        POST: async () => {
          await cleanupJob();
          return Response.json({ runs, lastRun });
        },
      },
      "/next": (req) => {
        const expr = qp(req, "expr") ?? "* * * * *";
        const tz = qp(req, "tz") ?? undefined;
        const count = Math.min(10, Math.max(1, Number(qp(req, "count")) || 3));
        const times: string[] = [];
        let cursor = new Date();
        try {
          for (let i = 0; i < count; i++) {
            const next = Bun.cron.parse(expr, cursor, tz ? { tz } : undefined);
            if (!next) break; // the expression can never match
            times.push(next.toISOString());
            // 방금 구한 시각을 기준으로 그다음 시각을 또 구한다
            cursor = next;
          }
        } catch (err) {
          throw new HttpError(400, (err as Error).message);
        }
        return Response.json({ expr, tz: tz ?? "local", next: times });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`45 cron → ${server.url}status`);
  // Stopping this example must also stop the timer, or it keeps firing.
  register("45", {
    url: server.url,
    stop: async (force?: boolean) => {
      job.stop();
      await server.stop(force);
    },
  });
}


// ========== [46] 46_shell_spawn.ts ==========
// ★ IMPORTANT — official bun.com sample "Shell" (safety side); scripting features and a pitfall: [53].
async function start46() {
  // Level: Intermediate. Running other programs: Bun Shell ($) and Bun.spawn.
  //   $`cmd ${value}`   Bun's own shell (cross-platform built-ins like
  //                     echo/ls/rm/mkdir). An interpolated value is ONE
  //                     argument and is never re-parsed, so
  //                     "; rm -rf / $(whoami)" is printed literally, not run
  //                     (verified). .text() reads stdout; a non-zero exit
  //                     THROWS unless you add .nothrow().
  //   Bun.spawn([...])  start any program with an argv array (no shell at
  //                     all). stdout is a ReadableStream; `await
  //                     proc.exited` gives the exit code.
  //   Bun.which(name)   find a program on PATH (null if missing).
  // Never expose endpoints like these on a public server; they are here
  // on localhost to show the APIs. Only harmless commands are used.
  // Try:
  //   curl 'localhost:3046/echo?text=;%20rm%20-rf%20/'
  //   curl localhost:3046/bun-version

  const server = Bun.serve({
    port: 3046,
    routes: {
      "/bun-version": async () => {
        const proc = Bun.spawn([process.execPath, "--version"], { stdout: "pipe", stderr: "pipe", env: BUN_CHILD_ENV });
        const out = await new Response(proc.stdout).text(); // Response is a handy stream reader
        return Response.json({ stdout: out.trim(), exitCode: await proc.exited });
      },
      "/echo": async (req) => {
        const text = (qp(req, "text") ?? "").slice(0, 200);
        return Response.json({ input: text, shellOutput: (await $`echo ${text}`.text()).trimEnd() });
      },
      "/which": (req) => {
        const cmd = qp(req, "cmd") ?? "";
        if (!/^[a-z0-9._-]{1,32}$/i.test(cmd)) throw new HttpError(400, "cmd: a program name");
        return Response.json({ cmd, path: Bun.which(cmd) });
      },
      "/failing": async () => {
        // nothrow: 실패해도 throw 대신 exitCode로 확인, quiet: 터미널에 안 찍음
        const r = await $`ls /definitely-missing-dir`.nothrow().quiet();
        return Response.json({ exitCode: r.exitCode, stderr: r.stderr.toString().trim() });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`46 shell_spawn → ${server.url}`);
  register("46", server);
}


// ========== [47] 47_bun_test.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "Testing" (and the
// toolchain command `bun test`).
async function start47() {
  // Level: Intermediate. bun test: a Jest-compatible test runner built in.
  //
  // The official sample: describe/test/expect, test.concurrent, mock() and
  // toHaveBeenCalledTimes. This example writes a small project with a test
  // file that uses each of those plus test.each, spyOn, setSystemTime and
  // test.todo (see ensureToolchainProject() above for its exact content),
  // then runs `bun test` on it as a child process and reports the result.
  //
  // How bun test works
  //   - Finds files named *.test.ts, *_test.ts, *.spec.ts (and .js/.tsx/...)
  //     under the current folder; `bun test foo` runs only paths containing
  //     "foo"; `-t "name"` filters by test name.
  //   - Each file runs in the same process as the runner (no worker spawn
  //     per file), which is why start-up takes milliseconds.
  //   - Tests in a file run one after another in order, except
  //     test.concurrent(), which runs its tests at the same time (good for
  //     I/O-bound tests).
  //   - expect() is Jest-compatible: toBe (Object.is), toEqual (deep),
  //     toMatchObject (subset), toThrow, toBeCloseTo, resolves/rejects, ...
  //   - mock(fn) records calls; spyOn(obj, "method") wraps a real method
  //     (mockRestore() puts it back); setSystemTime() fakes Date.
  //   - Lifecycle: beforeAll/beforeEach/afterEach/afterAll.
  //   - Snapshots: toMatchSnapshot() writes __snapshots__/ next to the test;
  //     `bun test -u` updates them. (Not used here so nothing is written.)
  //   - Exit code is 1 when anything fails: CI only checks that.
  //   Useful flags: --watch (rerun on save), --coverage (line/function
  //   coverage table; --coverage-reporter=lcov for CI tools), --bail
  //   (stop at first failure), --timeout <ms> (default 5000 per test),
  //   --rerun-each <n> (find flaky tests), --reporter=junit for CI.
  // The file that tests THIS file (the SELF-TEST section at the bottom) is a bun:test suite too.
  // Try:
  //   curl localhost:3047/run
  //   curl 'localhost:3047/run?coverage=1'
  //   curl localhost:3047/run-failing

  await ensureToolchainProject();

  const server = Bun.serve({
    port: 3047,
    routes: {
      "/run": async (req, srv) => {
        // 이 요청만 idleTimeout을 60초로 늘린다. 테스트 실행이 오래 걸려서
        srv.timeout(req, 60);
        const args = ["test", "./src/math.test.ts"];
        if (qp(req, "coverage") === "1") args.push("--coverage");
        const r = await runBun(args, { cwd: TOOLCHAIN_DIR });
        const out = r.stdout + r.stderr; // bun test reports on stderr
        return Response.json({ command: `bun ${args.join(" ")}`, exitCode: r.exitCode, ...testSummary(out), output: tail(out, args.includes("--coverage") ? 16 : 8) });
      },
      "/run-failing": async (req, srv) => {
        srv.timeout(req, 60);
        const r = await runBun(["test", "./src/failing.test.ts"], { cwd: TOOLCHAIN_DIR });
        const out = r.stdout + r.stderr;
        return Response.json({ command: "bun test ./src/failing.test.ts", exitCode: r.exitCode, ...testSummary(out), output: tail(out, 16) });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`47 bun_test ★ → ${server.url}run`);
  register("47", server);
}


// ========== [48] 48_toolchain.ts ==========
async function start48() {
  // Level: Intermediate. The rest of the bun toolchain: run, install,
  // build, check, fmt (test is [47]). One binary replaces node + npm +
  // tsc + esbuild + prettier + jest. Each endpoint below runs the real
  // command on the throwaway project and shows its output.
  //
  // bun run   (replaces node, ts-node, tsx, nodemon)
  //   `bun file.ts` runs TypeScript/JSX directly: Bun transpiles each file
  //   on load (types are REMOVED, not checked; checking is `bun check`).
  //   `bun run <script>` runs a package.json script; Bun puts
  //   node_modules/.bin on PATH and sets npm_package_* variables, like npm.
  //   If no script has that name, `bun run x` runs the file x.
  //   `--watch` restarts the process on file changes; `--hot` swaps code
  //   INSIDE the running process (Bun.serve keeps its port and sockets).
  //   `bunx <pkg>` runs a package's binary without installing it globally.
  //
  // bun install   (replaces npm, yarn, pnpm)
  //   Reads package.json, writes a text lockfile bun.lock (reviewable in
  //   diffs) and node_modules. Packages are cached globally and hard-linked
  //   (copy-on-write clones on macOS), so a second install is near instant.
  //   Lifecycle scripts of dependencies do NOT run unless the package is in
  //   "trustedDependencies": a supply-chain safety default.
  //   `bun add zod`, `bun add -d @types/bun`, `bun remove x`, `bun update`,
  //   `bun outdated`, `bun pm ls`; workspaces, catalogs, overrides and
  //   `bun patch` are supported. CI: `bun install --frozen-lockfile`.
  //   This project has no dependencies, so the demo needs no network.
  //
  // bun build   (replaces esbuild, vite, webpack)
  //   Bundles TS/JSX/CSS/HTML for the browser (--target browser, default)
  //   or for Bun/Node (--target bun|node). --minify, --sourcemap,
  //   --splitting, --outdir. `bun build ./index.html --production` builds
  //   a whole site; `bun ./index.html` starts a dev server ([80]).
  //   `bun build --compile app.ts` makes a single-file executable that
  //   contains the Bun runtime (tens of MB; cross-compile with --target
  //   bun-linux-x64 etc.). The same bundler is available as Bun.build() ([80]).
  //
  // bun check   (replaces tsc --noEmit; new in 1.4.4)
  //   Type-checks using the nearest tsconfig.json and prints the same
  //   errors as tsc (codes like TS2322), using all CPU cores. Exit code 1
  //   when there are errors. Code that uses Bun's globals needs the type
  //   definitions: `bun add -d @types/bun`. When stdout is not a terminal
  //   the errors come as <error file=... line=... code=...> blocks, easy
  //   to parse in CI.
  //
  // bun fmt   (replaces prettier, oxfmt)
  //   Formats JS/TS/CSS/HTML/JSON/YAML/Markdown, reading your Prettier or
  //   oxfmt config. `bun fmt --check` writes nothing and exits 1 if a file
  //   would change (use it in CI); `--stdin-filepath=x.ts` formats stdin
  //   and prints the result; `--staged` formats only git-staged files.
  //
  // Try:
  //   curl localhost:3048/run
  //   curl localhost:3048/install
  //   curl localhost:3048/build
  //   curl localhost:3048/check
  //   curl localhost:3048/fmt

  await ensureToolchainProject();
  const cwd = TOOLCHAIN_DIR;

  const server = Bun.serve({
    port: 3048,
    routes: {
      "/run": async () => {
        const script = await runBun(["run", "hello"], { cwd });
        const shell = await runBun(["run", "greet"], { cwd });
        const direct = await runBun(["./src/hello.ts"], { cwd });
        return Response.json({
          "bun run hello": { exitCode: script.exitCode, stdout: tail(script.stdout), stderr: tail(script.stderr) },
          "bun run greet": { exitCode: shell.exitCode, stdout: tail(shell.stdout) },
          "bun ./src/hello.ts": { exitCode: direct.exitCode, stdout: tail(direct.stdout) },
        });
      },
      "/install": async () => {
        const r = await runBun(["install"], { cwd });
        return Response.json({ command: "bun install", exitCode: r.exitCode, output: tail(r.stdout + r.stderr) });
      },
      "/build": async () => {
        const r = await runBun(["build", "./src/hello.ts", "--outdir", "dist", "--target", "bun", "--minify"], { cwd });
        // 빌드가 실패해 파일이 없으면 빈 문자열로 넘어간다
        const built = await Bun.file(`${cwd}/dist/hello.js`).text().catch(() => "");
        const run = await runBun(["./dist/hello.js"], { cwd });
        return Response.json({
          command: "bun build ./src/hello.ts --outdir dist --target bun --minify",
          exitCode: r.exitCode,
          output: tail(r.stdout + r.stderr),
          bundleBytes: built.length,
          bundleRuns: tail(run.stdout),
        });
      },
      "/check": async () => {
        const good = await runBun(["check", "./src/good.ts"], { cwd });
        const bad = await runBun(["check", "./src/bad.ts"], { cwd });
        const out = bad.stdout + bad.stderr;
        return Response.json({
          good: { exitCode: good.exitCode, output: tail(good.stdout + good.stderr, 2) },
          bad: { exitCode: bad.exitCode, code: /TS\d{4}/.exec(out)?.[0] ?? null, output: tail(out) },
        });
      },
      "/fmt": async () => {
        const check = await runBun(["fmt", "--check", "./src/ugly.ts"], { cwd });
        const formatted = await runBun(["fmt", "--stdin-filepath=ugly.ts"], { cwd, stdin: await Bun.file(`${cwd}/src/ugly.ts`).text() });
        return Response.json({
          check: { command: "bun fmt --check ./src/ugly.ts", exitCode: check.exitCode, output: tail(check.stdout + check.stderr) },
          stdin: { command: "bun fmt --stdin-filepath=ugly.ts < src/ugly.ts", exitCode: formatted.exitCode, before: await Bun.file(`${cwd}/src/ugly.ts`).text(), after: formatted.stdout },
        });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`48 toolchain → ${server.url}`);
  register("48", server);
}


// ========== [49] 49_websockets.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "WebSockets".
async function start49() {
  // Level: Intermediate. The reference shape of a Bun WebSocket server.
  //
  // The official sample: fetch() calls server.upgrade(req, { data: { room:
  // "lobby" } }) and answers 400 "Expected a WebSocket" otherwise; open()
  // subscribes to ws.data.room; message() does ws.publish(room, message).
  // This version keeps that shape and adds the parts a real one needs.
  // Deeper topics live elsewhere, so they are not repeated here:
  //   [21] echo basics  [29] rooms page  [66] backpressure/cork
  //   [71] ws.publish vs server.publish  [73] RPC protocol + rate limit
  //
  // What is new here
  //   - `websocket: { data: {} as Chat }` types ws.data (the 1.3+ style:
  //     the empty object is only a type carrier and is never used).
  //   - Input is validated BEFORE upgrade: a bad room is a normal HTTP 400,
  //     and a request that is not a WebSocket gets 426 Upgrade Required
  //     (the precise status; the official sample uses 400).
  //   - Subprotocol negotiation: the client offers Sec-WebSocket-Protocol
  //     values; the server picks one and returns it in the upgrade headers.
  //     This lets you version your message format ("chat.v1").
  //   - Limits: maxPayloadLength (bigger frames close the socket with 1009),
  //     idleTimeout (Bun pings and closes dead connections).
  //   - publishToSelf: false (default) means ws.publish skips the sender.
  //   - HTTP -> WebSocket: POST /rooms/:room/broadcast uses server.publish,
  //     the usual way a webhook or a cron job pushes to connected clients.
  //   - The CLIENT side in Bun: `new WebSocket(url, { protocols, headers })`.
  //     Browsers cannot set headers on a WebSocket; Bun can, which is how a
  //     backend service authenticates to another one (GET /client-demo).
  // Try:
  //   open http://localhost:3049/ in two tabs
  //   curl localhost:3049/client-demo
  //   curl localhost:3049/rooms/lobby
  //   curl -X POST localhost:3049/rooms/lobby/broadcast -d 'deploy finished'

  type Chat = { room: string; name: string; protocol: string | null };
  const ROOM = /^[a-z0-9-]{1,32}$/;
  const NAME = /^[\w-]{1,20}$/;
  const SUPPORTED = ["chat.v1"];

  const page = `<!doctype html><meta charset="utf-8"><title>WebSockets ★</title>
<h1>room <span id="room"></span></h1><ul id="log"></ul>
<form id="f"><input id="msg" autocomplete="off" placeholder="say something"><button>send</button></form>
<script>
const room = new URLSearchParams(location.search).get("room") || "lobby";
const name = "guest-" + Math.random().toString(36).slice(2, 6);
document.getElementById("room").textContent = room;
const ws = new WebSocket("ws://" + location.host + "/ws?room=" + room + "&name=" + name, ["chat.v1"]);
const log = (t) => { const li = document.createElement("li"); li.textContent = t; document.getElementById("log").append(li); };
ws.onmessage = (e) => { const m = JSON.parse(e.data); log(m.type + ": " + (m.text ?? m.name ?? "") + (m.members ? " (" + m.members + " here)" : "")); };
document.getElementById("f").onsubmit = (e) => { e.preventDefault(); const i = document.getElementById("msg"); ws.send(i.value); log("me: " + i.value); i.value = ""; };
</script>`;

  // 핸들러 안에서 server를 다시 쓰니 타입을 직접 적어 줘야 TS가 헷갈리지 않는다
  const server: Server<Chat> = Bun.serve({
    port: 3049,
    routes: {
      "/": new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
      "/rooms/:room": (req) => {
        if (!ROOM.test(req.params.room)) throw new HttpError(400, "room: [a-z0-9-]{1,32}");
        return Response.json({ room: req.params.room, members: server.subscriberCount(req.params.room) });
      },
      "/rooms/:room/broadcast": {
        POST: async (req) => {
          if (!ROOM.test(req.params.room)) throw new HttpError(400, "room: [a-z0-9-]{1,32}");
          const text = (await req.text()).slice(0, 500);
          // server.publish returns the bytes sent, 0 if nobody is subscribed
          // (or -1 when a client is backpressured: the message is queued).
          const sent = server.publish(req.params.room, JSON.stringify({ type: "system", text }));
          return Response.json({ room: req.params.room, members: server.subscriberCount(req.params.room), sentBytes: sent });
        },
      },
      "/client-demo": async () => {
        // Two Bun WebSocket clients talk to this same server.
        const room = `demo-${crypto.randomUUID().slice(0, 8)}`;
        const open = (name: string) =>
          new Promise<WebSocket>((resolve, reject) => {
            const ws = new WebSocket(`ws://127.0.0.1:3049/ws?room=${room}&name=${name}`, {
              protocols: ["chat.v1"],
              headers: { "User-Agent": "bun-service-client" }, // Bun-only option
            });
            ws.onopen = () => resolve(ws);
            ws.onerror = () => reject(new Error("connect failed"));
          });
        const received: Record<string, string[]> = { ada: [], bob: [] };
        const ada = await open("ada");
        ada.onmessage = (e) => received.ada!.push(JSON.parse(String(e.data)).type);
        const bob = await open("bob");
        const bobGotChat = new Promise<string>((resolve) => {
          bob.onmessage = (e) => {
            const m = JSON.parse(String(e.data));
            received.bob!.push(m.type);
            if (m.type === "chat") resolve(m.text);
          };
        });
        ada.send("hi bob");
        const text = await Promise.race([bobGotChat, Bun.sleep(2000).then(() => "(timeout)")]);
        await Bun.sleep(50); // let the ack reach ada
        const result = { room, protocol: ada.protocol, bobReceived: text, adaReceived: received.ada, bobTypes: received.bob };
        ada.close();
        bob.close();
        return Response.json(result);
      },
    },
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname !== "/ws") return Response.json({ error: "Not Found" }, { status: 404 });
      const room = url.searchParams.get("room") ?? "lobby";
      const name = url.searchParams.get("name") ?? "";
      if (!ROOM.test(room) || !NAME.test(name)) return Response.json({ error: "room or name invalid" }, { status: 400 });
      // 클라이언트는 'a, b'처럼 쉼표로 여러 개를 제안한다
      const offered = (req.headers.get("sec-websocket-protocol") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const protocol = offered.find((p) => SUPPORTED.includes(p)) ?? null;
      if (offered.length > 0 && !protocol) return Response.json({ error: `supported protocols: ${SUPPORTED.join(", ")}` }, { status: 400 });
      const ok = srv.upgrade(req, {
        data: { room, name, protocol },
        headers: protocol ? { "Sec-WebSocket-Protocol": protocol } : undefined,
      });
      if (ok) return undefined; // Bun has taken over the connection
      return new Response("Expected a WebSocket", { status: 426, headers: { Upgrade: "websocket" } });
    },
    websocket: {
      data: {} as Chat,
      maxPayloadLength: 16 * 1024,
      idleTimeout: 120,
      publishToSelf: false,
      open(ws) {
        ws.subscribe(ws.data.room);
        ws.send(JSON.stringify({ type: "welcome", name: ws.data.name, members: server.subscriberCount(ws.data.room) }));
        ws.publish(ws.data.room, JSON.stringify({ type: "join", name: ws.data.name }));
      },
      message(ws, message) {
        const text = (typeof message === "string" ? message : new TextDecoder().decode(message)).slice(0, 1000);
        ws.publish(ws.data.room, JSON.stringify({ type: "chat", name: ws.data.name, text }));
        ws.send(JSON.stringify({ type: "ack" }));
      },
      close(ws) {
        // ws has already left its topics here (verified on 1.4.4), so
        // server.publish reaches only the others.
        server.publish(ws.data.room, JSON.stringify({ type: "leave", name: ws.data.name }));
      },
    },
    error: errorResponse,
  });

  console.log(`49 websockets ★ → ${server.url}`);
  register("49", server);
}


// ========== [50] 50_bun_sql.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "PostgreSQL".
async function start50() {
  // Level: Intermediate. Bun.sql: one tagged-template API for PostgreSQL,
  // MySQL and SQLite, with no driver package.
  //
  // The official sample: `sql\`SELECT * FROM users WHERE active = ${true}
  // LIMIT ${10}\`` and `INSERT INTO users ${sql({ name, email })} RETURNING *`.
  //
  // Which database
  //   new SQL(url) picks the adapter from the URL: postgres://..., mysql://...,
  //   sqlite://file.db or ":memory:". The default `sql` export reads
  //   $DATABASE_URL. This example uses Postgres ONLY when you opt in with
  //   BUN_DEMO_PG_URL (it creates a table named bun_demo_users there);
  //   otherwise the identical code runs on SQLite in memory. Only the
  //   CREATE TABLE differs between the two.
  //
  // The helpers, all of them safe from SQL injection
  //   ${value}                 a bound parameter (never pasted into the text)
  //   ${sql(obj)}              INSERT columns+values from an object
  //   ${sql(obj, "a", "b")}    ...only columns a and b. Use this with request
  //                            bodies: extra fields like {"role":"admin"} are
  //                            ignored instead of written (mass assignment).
  //   ${sql([obj, obj])}       multi-row INSERT in one statement
  //   IN ${sql([1, 2, 3])}     a list for IN (...)
  //   ${sql("column")}         an IDENTIFIER (quoted name), for dynamic ORDER
  //                            BY; still check it against an allow-list
  //   ${cond ? sql`DESC` : sql`ASC`}   compose fragments
  //   sql.unsafe("...")        raw text, ONLY for trusted strings (migrations)
  //   .values()                rows as arrays instead of objects
  // Transactions: sql.begin(async (tx) => { ... }). Every query inside uses
  // the same connection; if the callback throws, Bun sends ROLLBACK and
  // rethrows, otherwise COMMIT. Use tx`...`, not sql`...`, inside it.
  // Pipelining (Postgres): queries started together (Promise.all) are sent
  // without waiting for each answer, so 3 queries cost about 1 round trip.
  // Results are arrays with extra fields: count, command, lastInsertRowid.
  // Errors: SQLite throws SQLiteError (code "SQLITE_CONSTRAINT_UNIQUE");
  // Postgres throws PostgresError (errno "23505" = unique violation).
  // Try:
  //   curl 'localhost:3050/users?active=true&limit=10'
  //   curl 'localhost:3050/users/by-ids?ids=1,3'
  //   curl 'localhost:3050/users/sorted?by=name&dir=desc'
  //   curl localhost:3050/users -H 'Content-Type: application/json' -d '{"name":"Eve","email":"eve@example.com","role":"admin"}'
  //   curl -X POST localhost:3050/tx-demo
  //   curl localhost:3050/pipelining

  const pgUrl = Bun.env.BUN_DEMO_PG_URL;
  const sql = pgUrl ? new SQL(pgUrl) : new SQL(":memory:");
  const adapter = pgUrl ? "postgres" : "sqlite";

  if (adapter === "postgres") {
    await sql`CREATE TABLE IF NOT EXISTS bun_demo_users (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  } else {
    await sql`CREATE TABLE IF NOT EXISTS bun_demo_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`;
  }
  // 결과는 행 배열이라 첫 행을 바로 구조 분해한다
  const [{ n }] = await sql`SELECT count(*) AS n FROM bun_demo_users`;
  if (Number(n) === 0) {
    await sql`INSERT INTO bun_demo_users ${sql([
      { name: "Alice", email: "alice@example.com", active: true },
      { name: "Bob", email: "bob@example.com", active: false },
      { name: "Cy", email: "cy@example.com", active: true },
    ])}`;
  }

  type Row = { id: number; name: string; email: string; active: boolean | number };
  // SQLite는 boolean을 0/1로 돌려줘서 응답 모양을 하나로 맞춘다
  const shape = (r: Row) => ({ id: Number(r.id), name: r.name, email: r.email, active: Boolean(r.active) });
  const isUnique = (err: unknown) => {
    const e = err as { code?: string; errno?: string | number };
    return e.code === "SQLITE_CONSTRAINT_UNIQUE" || e.errno === "23505";
  };
  const SORTABLE = ["id", "name", "email"];
  const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
  function validUser(v: unknown) {
    const o = v as { name?: unknown; email?: unknown };
    if (typeof o?.name !== "string" || o.name.trim().length < 1 || o.name.length > 50) throw new HttpError(422, "name: 1-50 characters");
    if (typeof o.email !== "string" || !EMAIL.test(o.email)) throw new HttpError(422, "email: not an e-mail address");
    return o as { name: string; email: string };
  }

  const server = Bun.serve({
    port: 3050,
    routes: {
      "/": () => Response.json({ adapter, table: "bun_demo_users" }),
      "/users": {
        GET: async (req) => {
          // 'false'일 때만 false, 나머지는 전부 true
          const active = qp(req, "active") !== "false";
          const limit = Math.min(Math.max(Number(qp(req, "limit") ?? 10) || 10, 1), 100);
          const rows = await sql`SELECT id, name, email, active FROM bun_demo_users
                                 WHERE active = ${active} ORDER BY id LIMIT ${limit}`;
          return Response.json(rows.map(shape));
        },
        POST: async (req) => {
          const body = validUser(await readJsonCapped(req, 4096));
          try {
            // body may contain {"role":"admin"}; only name and email are written.
            const [row] = await sql`INSERT INTO bun_demo_users ${sql(body, "name", "email")}
                                    RETURNING id, name, email, active, role`;
            return Response.json({ ...shape(row), role: row.role }, { status: 201, headers: { Location: `/users/${row.id}` } });
          } catch (err) {
            if (isUnique(err)) throw new HttpError(409, "email already registered");
            throw err;
          }
        },
      },
      "/users/bulk": {
        POST: async (req) => {
          const body = await readJsonCapped(req, 64 * 1024);
          if (!Array.isArray(body) || body.length < 1 || body.length > 50) throw new HttpError(422, "send an array of 1-50 users");
          const rows = body.map(validUser);
          try {
            const result = await sql`INSERT INTO bun_demo_users ${sql(rows, "name", "email")}`;
            return Response.json({ inserted: result.count }, { status: 201 });
          } catch (err) {
            if (isUnique(err)) throw new HttpError(409, "an email is already registered; nothing was inserted");
            throw err;
          }
        },
      },
      "/users/by-ids": async (req) => {
        const ids = (qp(req, "ids") ?? "").split(",").filter((s) => /^\d{1,9}$/.test(s)).map(Number).slice(0, 100);
        if (ids.length === 0) throw new HttpError(400, "ids=1,2,3");
        return Response.json((await sql`SELECT id, name, email, active FROM bun_demo_users WHERE id IN ${sql(ids)} ORDER BY id`).map(shape));
      },
      "/users/sorted": async (req) => {
        const by = qp(req, "by") ?? "id";
        if (!SORTABLE.includes(by)) throw new HttpError(400, `by: one of ${SORTABLE.join(", ")}`);
        const desc = qp(req, "dir") === "desc";
        const rows = await sql`SELECT id, name, email, active FROM bun_demo_users
                               ORDER BY ${sql(by)} ${desc ? sql`DESC` : sql`ASC`} LIMIT 20`;
        return Response.json(rows.map(shape));
      },
      "/tx-demo": {
        POST: async () => {
          const count = async () => Number((await sql`SELECT count(*) AS n FROM bun_demo_users`)[0].n);
          const before = await count();
          const tag = crypto.randomUUID().slice(0, 8);
          let error = "";
          try {
            await sql.begin(async (tx) => {
              await tx`INSERT INTO bun_demo_users ${tx({ name: "Tx-ok", email: `tx-${tag}@example.com` })}`;
              // The same e-mail again: violates UNIQUE, the callback throws,
              // and the first INSERT is rolled back with it.
              await tx`INSERT INTO bun_demo_users ${tx({ name: "Tx-dup", email: `tx-${tag}@example.com` })}`;
            });
          } catch (err) {
            error = isUnique(err) ? "unique violation" : (err as Error).message;
          }
          const after = await count();
          return Response.json({ before, after, rolledBack: before === after, error });
        },
      },
      "/pipelining": async () => {
        const t0 = performance.now();
        const [users, active, first] = await Promise.all([
          sql`SELECT count(*) AS n FROM bun_demo_users`,
          sql`SELECT count(*) AS n FROM bun_demo_users WHERE active = ${true}`,
          sql`SELECT id, name FROM bun_demo_users ORDER BY id LIMIT 1`.values(),
        ]);
        return Response.json({
          adapter,
          users: Number(users[0].n),
          active: Number(active[0].n),
          firstAsArray: first[0],
          ms: Math.round((performance.now() - t0) * 10) / 10,
        });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`50 bun_sql ★ → ${server.url}  (adapter: ${adapter})`);
  register("50", {
    url: server.url,
    stop: async (force?: boolean) => {
      await server.stop(force);
      await sql.close();
    },
  });
}


// ========== [51] 51_bun_redis.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "Redis".
async function start51() {
  // Level: Intermediate. Bun.redis: a built-in Redis client (no ioredis).
  //
  // The official sample: redis.set/get, redis.hset("user:1", {...}),
  // redis.expire(key, 3600), and a subscriber from redis.duplicate() that
  // calls subscribe("events", cb). This example uses each of those in the
  // patterns they exist for:
  //   GET  /hits            INCR: an atomic counter shared by all servers
  //   GET  /square?n=7      cache-aside: look in Redis first, compute and
  //                         SET ... EX 30 on a miss (expires by itself)
  //   POST /profile         HSET a hash + EXPIRE; GET /profile -> HGETALL
  //   POST /publish?msg=hi  PUBLISH; GET /events shows what the subscriber got
  //
  // How the client works
  //   - `redis` (default export) reads $REDIS_URL (or localhost:6379);
  //     new RedisClient(url, options) makes your own. It connects lazily on
  //     the first command and reconnects automatically.
  //   - Commands sent while others are in flight are PIPELINED: written
  //     back-to-back on one connection, answers matched in order. 20
  //     concurrent INCRs cost about one round trip, not 20.
  //   - A connection in subscribe mode can only (un)subscribe, so pub/sub
  //     needs a SECOND connection: `await client.duplicate()`.
  //   - Unusual commands: client.send("CMD", ["arg", ...]).
  //   - Keys here start with "bun-demo:" so they never collide with real data.
  //
  // No Redis needed: unless BUN_DEMO_REDIS_URL is set, startToyRedis() below
  // runs a tiny server that speaks the Redis wire protocol (RESP3) for just
  // the commands used here. The real RedisClient talks to it exactly as it
  // would to Redis. It is a teaching toy (no persistence, no eviction, 10
  // commands), not a Redis replacement.
  // Try:
  //   curl localhost:3051/hits
  //   curl 'localhost:3051/square?n=12'     # twice: cached:false then true
  //   curl -X POST 'localhost:3051/profile?name=Alice&plan=pro' && curl localhost:3051/profile
  //   curl -X POST 'localhost:3051/publish?msg=deployed' && curl localhost:3051/events

  const external = Bun.env.BUN_DEMO_REDIS_URL;
  const toy = external ? null : startToyRedis();
  const url = external ?? `redis://127.0.0.1:${toy!.port}`;
  const client = new RedisClient(url, { connectionTimeout: 3000, autoReconnect: true });
  const subscriber = await client.duplicate();
  const CHANNEL = "bun-demo:events";
  const received: { channel: string; message: string; at: string }[] = [];
  // 메시지가 올 때마다 콜백이 불린다. 최근 20개만 남긴다
  await subscriber.subscribe(CHANNEL, (message, channel) => {
    received.push({ channel, message, at: new Date().toISOString() });
    if (received.length > 20) received.shift();
  });

  const server = Bun.serve({
    port: 3051,
    routes: {
      "/": () => Response.json({ backend: external ? "external redis (BUN_DEMO_REDIS_URL)" : "in-process toy RESP3 server" }),
      "/hits": async () => Response.json({ hits: await client.incr("bun-demo:hits") }),
      "/square": async (req) => {
        const n = Number(qp(req, "n"));
        if (!Number.isInteger(n) || Math.abs(n) > 1e6) throw new HttpError(400, "n: an integer");
        const key = `bun-demo:square:${n}`;
        const hit = await client.get(key);
        if (hit !== null) return Response.json({ n, square: Number(hit), cached: true, ttl: await client.ttl(key) });
        await Bun.sleep(100); // pretend this is expensive
        const square = n * n;
        // EX 30: 30초 뒤에 Redis가 알아서 지운다
        await client.set(key, String(square), "EX", 30);
        return Response.json({ n, square, cached: false, ttl: 30 });
      },
      "/profile": {
        POST: async (req) => {
          const name = (qp(req, "name") ?? "").slice(0, 50);
          const plan = qp(req, "plan") ?? "free";
          if (!name || !["free", "pro"].includes(plan)) throw new HttpError(400, "name=...&plan=free|pro");
          await client.hset("bun-demo:user:1", { name, plan, updatedAt: Date.now() });
          await client.expire("bun-demo:user:1", 3600);
          return Response.json({ saved: true, ttl: await client.ttl("bun-demo:user:1") });
        },
        GET: async () => Response.json(await client.hgetall("bun-demo:user:1")),
      },
      "/publish": {
        POST: async (req) => {
          const msg = (qp(req, "msg") ?? "").slice(0, 200);
          if (!msg) throw new HttpError(400, "msg=...");
          // publish는 메시지를 받은 구독자 수를 돌려준다
          return Response.json({ receivers: await client.publish(CHANNEL, msg) });
        },
      },
      "/events": () => Response.json(received),
      "/pipelining": async () => {
        const t0 = performance.now();
        const values = await Promise.all(Array.from({ length: 20 }, () => client.incr("bun-demo:pipelined")));
        return Response.json({ last: values.at(-1), commands: values.length, ms: Math.round((performance.now() - t0) * 10) / 10 });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`51 bun_redis ★ → ${server.url}  (${external ? "external" : "toy server"})`);
  register("51", {
    url: server.url,
    stop: async (force?: boolean) => {
      await server.stop(force);
      subscriber.close();
      client.close();
      toy?.stop(true);
    },
  });
}

/**
 * A toy server for [51] that speaks RESP3, the Redis wire protocol.
 * RESP is simple text framing:
 *   request   *3\r\n$3\r\nSET\r\n$1\r\nk\r\n$1\r\nv\r\n   (array of bulk strings)
 *   replies   +OK  :42 (integer)  $5\r\nhello (bulk)  _ (null)
 *             %2 (map, RESP3)  >3 (push: pub/sub messages, RESP3)  -ERR ...
 * Bun's client starts with HELLO 3 to switch to RESP3, which is why HELLO
 * must answer with a map. Data can arrive split or several commands at
 * once (pipelining), so bytes are buffered and parsed in a loop: a TCP
 * stream has no message boundaries ([77] shows the same with Bun.listen).
 */
function startToyRedis() {
  type Conn = { buf: Buffer; channels: Set<string> };
  const store = new Map<string, { value: string | Map<string, string>; expiresAt?: number }>();
  const subscribers = new Map<string, Set<Bun.Socket<Conn>>>();
  const enc = {
    simple: (s: string) => `+${s}\r\n`,
    error: (s: string) => `-ERR ${s}\r\n`,
    int: (n: number) => `:${n}\r\n`,
    bulk: (s: string | null) => (s === null ? "_\r\n" : `$${Buffer.byteLength(s)}\r\n${s}\r\n`),
    map: (o: Record<string, string>) =>
      `%${Object.keys(o).length}\r\n` + Object.entries(o).map(([k, v]) => enc.bulk(k) + enc.bulk(v)).join(""),
    push: (items: string[]) => `>${items.length}\r\n` + items.join(""),
  };
  // Expiry is lazy, like in real Redis: a key is removed when read after its deadline.
  const live = (key: string) => {
    const e = store.get(key);
    if (e?.expiresAt !== undefined && Date.now() >= e.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return e;
  };
  /** One complete command from the buffer, or null if more bytes are needed. */
  function parse(c: Conn): string[] | null {
    const b = c.buf;
    if (b.length === 0 || b[0] !== 0x2a /* "*" */) return null;
    const pos = b.indexOf("\r\n");
    if (pos < 0) return null;
    const n = Number(b.subarray(1, pos).toString());
    const args: string[] = [];
    let at = pos + 2;
    for (let i = 0; i < n; i++) {
      const end = b.indexOf("\r\n", at);
      if (end < 0) return null;
      const len = Number(b.subarray(at + 1, end).toString());
      if (b.length < end + 2 + len + 2) return null;
      args.push(b.subarray(end + 2, end + 2 + len).toString());
      at = end + 2 + len + 2;
    }
    // 처리한 만큼 버퍼 앞을 잘라 낸다
    c.buf = b.subarray(at);
    return args;
  }
  function run(s: Bun.Socket<Conn>, [cmd = "", ...a]: string[]): string {
    switch (cmd.toUpperCase()) {
      case "HELLO":
        return enc.map({ server: "toy-redis", version: "0.0.1", proto: "3" });
      case "PING":
        return enc.simple("PONG");
      case "SET": {
        const ex = a.findIndex((x) => x.toUpperCase() === "EX");
        store.set(a[0]!, { value: a[1]!, expiresAt: ex >= 0 ? Date.now() + Number(a[ex + 1]) * 1000 : undefined });
        return enc.simple("OK");
      }
      case "GET": {
        const e = live(a[0]!);
        return enc.bulk(typeof e?.value === "string" ? e.value : null);
      }
      case "INCR": {
        const e = live(a[0]!);
        const n = Number(e?.value ?? 0) + 1;
        store.set(a[0]!, { value: String(n), expiresAt: e?.expiresAt });
        return enc.int(n);
      }
      case "EXPIRE": {
        const e = live(a[0]!);
        if (!e) return enc.int(0);
        e.expiresAt = Date.now() + Number(a[1]) * 1000;
        return enc.int(1);
      }
      case "TTL": {
        const e = live(a[0]!);
        // Redis 규칙: -2는 키 없음, -1은 만료 시간 없음
        if (!e) return enc.int(-2);
        return enc.int(e.expiresAt === undefined ? -1 : Math.ceil((e.expiresAt - Date.now()) / 1000));
      }
      case "HSET": {
        const e = live(a[0]!);
        const h = e && typeof e.value !== "string" ? e.value : new Map<string, string>();
        let added = 0;
        for (let i = 1; i + 1 < a.length; i += 2) {
          if (!h.has(a[i]!)) added++;
          h.set(a[i]!, a[i + 1]!);
        }
        store.set(a[0]!, { value: h, expiresAt: e?.expiresAt });
        return enc.int(added);
      }
      case "HGETALL": {
        const e = live(a[0]!);
        return enc.map(e && typeof e.value !== "string" ? Object.fromEntries(e.value) : {});
      }
      case "PUBLISH": {
        const subs = subscribers.get(a[0]!) ?? new Set();
        for (const sub of subs) sub.write(enc.push([enc.bulk("message"), enc.bulk(a[0]!), enc.bulk(a[1]!)]));
        return enc.int(subs.size);
      }
      case "SUBSCRIBE":
        return a
          .map((ch) => {
            s.data.channels.add(ch);
            if (!subscribers.has(ch)) subscribers.set(ch, new Set());
            subscribers.get(ch)!.add(s);
            return enc.push([enc.bulk("subscribe"), enc.bulk(ch), enc.int(s.data.channels.size)]);
          })
          .join("");
      case "UNSUBSCRIBE":
        return (a.length ? a : [...s.data.channels])
          .map((ch) => {
            s.data.channels.delete(ch);
            subscribers.get(ch)?.delete(s);
            return enc.push([enc.bulk("unsubscribe"), enc.bulk(ch), enc.int(s.data.channels.size)]);
          })
          .join("");
      default:
        return enc.error(`unknown command '${cmd}'`);
    }
  }
  return Bun.listen<Conn>({
    hostname: "127.0.0.1",
    port: 0,
    socket: {
      open(s) {
        s.data = { buf: Buffer.alloc(0), channels: new Set() };
      },
      data(s, chunk) {
        s.data.buf = Buffer.concat([s.data.buf, chunk]);
        let out = "";
        for (let args = parse(s.data); args; args = parse(s.data)) out += run(s, args);
        if (out) s.write(out);
      },
      close(s) {
        for (const ch of s.data.channels) subscribers.get(ch)?.delete(s);
      },
    },
  });
}


// ========== [52] 52_bun_s3.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "S3".
async function start52() {
  // Level: Intermediate. Bun.s3: read, write and presign objects on any
  // S3-compatible store (AWS S3, Cloudflare R2, MinIO, DigitalOcean ...).
  //
  // The official sample: s3.file("uploads/avatar.png"), file.write(bytes,
  // { type }), file.presign({ expiresIn: 3600 }), file.exists().
  //
  // How it works
  //   - s3.file(key) returns an S3File: LAZY like Bun.file(), nothing is
  //     fetched until you call .text()/.bytes()/.stream()/.exists()/.write().
  //     .slice(a, b) becomes an HTTP Range request.
  //   - Bun.write(s3file, Bun.file("local")) copies a file up, streaming.
  //   - The default `s3` reads S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
  //     S3_BUCKET, S3_ENDPOINT, S3_REGION (or the AWS_* names). new
  //     S3Client({...}) takes the same values explicitly.
  //   - presign() is pure local computation: an HMAC-SHA256 signature
  //     (AWS Signature V4) over method, key and expiry, using your secret
  //     key. It needs NO network, which is why it works in this demo even
  //     without a bucket. Anyone holding the URL can do exactly that one
  //     operation until it expires, and nothing else.
  //
  // The pattern shown: clients upload and download DIRECTLY with S3 using
  // presigned URLs; your server only decides who may do what and signs.
  // Your server never carries the bytes, so large files cost it nothing.
  //   GET /presign?key=uploads/avatar.png&method=PUT  -> URL to PUT to
  //   GET /download/uploads/avatar.png                -> 302 to a GET URL
  //   PUT /objects/<key>  and  GET /objects/<key>     -> server-side copy
  //                       (needs BUN_DEMO_S3=1 and a real bucket)
  // Try:
  //   curl 'localhost:3052/presign?key=uploads/avatar.png&method=PUT&type=image/png'
  //   curl -i localhost:3052/download/uploads/avatar.png
  //   curl -X PUT --data-binary @some.png localhost:3052/objects/uploads/x.png   # 503 unless enabled

  const live = Bun.env.BUN_DEMO_S3 === "1";
  // With no bucket configured, a client with dummy keys still presigns
  // (the URLs just will not work against a real server).
  const s3 = live
    ? new S3Client()
    : new S3Client({ accessKeyId: "DEMOKEY", secretAccessKey: "DEMOSECRET", bucket: "demo-bucket", endpoint: "http://127.0.0.1:9000", region: "us-east-1" });
  // (?!.*\.\.) : 문자열 어디에도 '..'가 없을 때만 통과
  const KEY = /^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9/_.-]{0,200}$/;
  const checkKey = (key: string) => {
    if (!KEY.test(key)) throw new HttpError(400, "key: [A-Za-z0-9/_.-], no '..'");
    return key;
  };
  const needLive = () => {
    if (!live) throw new HttpError(503, "S3 is not configured: set BUN_DEMO_S3=1 and S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT");
  };

  const server = Bun.serve({
    port: 3052,
    routes: {
      "/": () => Response.json({ live }),
      "/presign": (req) => {
        const key = checkKey(qp(req, "key") ?? "");
        const method = (qp(req, "method") ?? "GET").toUpperCase();
        if (method !== "GET" && method !== "PUT") throw new HttpError(400, "method: GET or PUT");
        const expiresIn = Math.min(Math.max(Number(qp(req, "expires") ?? 600) || 600, 60), 3600);
        const type = qp(req, "type") ?? undefined;
        const url = s3.file(key).presign({ method, expiresIn, type });
        return Response.json({ key, method, expiresIn, live, url });
      },
      "/download/*": (req) => {
        const key = checkKey(decodeURIComponent(new URL(req.url).pathname.slice("/download/".length)));
        return Response.redirect(s3.presign(key, { method: "GET", expiresIn: 300 }), 302);
      },
      "/objects/*": {
        PUT: async (req) => {
          needLive();
          const key = checkKey(decodeURIComponent(new URL(req.url).pathname.slice("/objects/".length)));
          const bytes = await req.bytes();
          if (bytes.byteLength > 4 * 1024 * 1024) throw new HttpError(413, "max 4 MB");
          await s3.file(key).write(bytes, { type: req.headers.get("content-type") ?? "application/octet-stream" });
          return Response.json({ key, size: bytes.byteLength }, { status: 201 });
        },
        GET: async (req) => {
          needLive();
          const key = checkKey(decodeURIComponent(new URL(req.url).pathname.slice("/objects/".length)));
          const file = s3.file(key);
          if (!(await file.exists())) throw new HttpError(404, "no such object");
          // 통째로 읽지 않고 스트림으로 바로 흘려보낸다
          return new Response(file.stream());
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`52 bun_s3 ★ → ${server.url}  (${live ? "live bucket" : "presign only"})`);
  register("52", server);
}


// ========== [53] 53_bun_shell.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "Shell".
async function start53() {
  // Level: Intermediate. Bun.$ as a scripting language: the features a
  // build or deploy script uses. [46] covers the safety side (interpolation
  // cannot inject, .nothrow()) and Bun.spawn; this one is about scripting.
  //
  // The official sample:
  //   const branch = await $`git rev-parse --abbrev-ref HEAD`.text();
  //   await $`bun run build`;
  //   await $`gzip -9 < ${res} > data.json.gz`;
  // VERIFIED ON 1.4.4: the last line throws a parse error ("expected a
  // command or assignment but got: Redirect"). Bun's shell does not accept
  // an input AND an output redirect on the same command. Two forms that
  // work, both used below:
  //   await $`gzip -9 < ${res} | cat > ${outPath}`;      // pipe, then redirect
  //   const r = await $`gzip -9 < ${res}`.quiet(); await Bun.write(outPath, r.stdout);
  //
  // What the steps at GET /script show
  //   .text() .json() .lines()   read stdout as text, parsed JSON, or line
  //                              by line (async iterator; note the trailing "")
  //   .cwd(dir)                  run in another folder (no `cd` state leaks)
  //   .env({...})                REPLACES the environment for that command:
  //                              $HOME is empty afterwards (verified). Spread
  //                              process.env in if you only want to add.
  //   < ${response}              a Response/Blob/Buffer as stdin, no temp file
//   cat, echo, ls, mkdir, rm   built into Bun Shell, so they work on Windows too
  //   > ${buffer}                stdout straight into a JS Buffer
  //   *.txt                      globs are expanded by Bun itself (also on
  //                              Windows, where there is no bash)
  //   $.escape(s)                how an interpolated value is quoted
  //   ShellError                 a non-zero exit THROWS with .exitCode, .stderr
  // Commands like echo, ls, cat, mkdir, rm, cd, pwd are built into Bun's
  // shell and behave the same on every OS; gzip and git are real programs
  // from PATH (the gzip step is skipped if gzip is missing).
  // Try:
  //   curl localhost:3053/script

  const WORK = `${tmpdir()}/bun-all-ts-shell`;

  const server = Bun.serve({
    port: 3053,
    routes: {
      "/script": async (req, srv) => {
        srv.timeout(req, 30);
        const steps: Record<string, unknown> = {};
        await $`mkdir -p ${WORK}/out`;
        await Bun.write(`${WORK}/a.txt`, "alpha\n");
        await Bun.write(`${WORK}/b.txt`, "beta\n");
        await Bun.write(`${WORK}/notes.md`, "# not a txt\n");

        steps.glob = (await $`ls *.txt`.cwd(WORK).text()).split(/\s+/).filter(Boolean).sort();
        steps.json = await $`echo ${JSON.stringify({ ok: true, n: 3 })}`.json();
        const lines: string[] = [];
        for await (const line of $`cat a.txt b.txt`.cwd(WORK).lines()) lines.push(line);
        steps.lines = lines;
        steps.envReplaced = (await $`echo "$GREETING|$HOME|"`.env({ GREETING: "hi" }).text()).trim();
        steps.envAdded = (await $`echo "$GREETING"`.env({ ...process.env, GREETING: "hi" }).text()).trim();
        // `cat` is built into Bun Shell on every OS (wc is not, e.g. on Windows).
        steps.stdinFromResponse = String((await $`cat < ${new Response("1\n2\n3\n")}`.text()).split("\n").filter(Boolean).length);
        const buf = Buffer.alloc(32);
        await $`echo into-a-buffer > ${buf}`;
        steps.stdoutToBuffer = buf.toString().replace(/\0+$/, "").trim();
        steps.escape = $.escape("a b; rm -rf /");

        if (Bun.which("gzip")) {
          const gz = `${WORK}/out/data.json.gz`;
          const payload = JSON.stringify({ items: Array.from({ length: 50 }, (_, i) => ({ i, name: `item-${i}` })) });
          let doubleRedirect = "worked";
          try {
            await $`gzip -9 < ${new Response(payload)} > ${gz}`.quiet();
          } catch (err) {
            doubleRedirect = `fails on ${Bun.version}: ${(err as Error).message}`;
          }
          await $`gzip -9 < ${new Response(payload)} | cat > ${gz}`;
          const roundTrip = new TextDecoder().decode(Bun.gunzipSync(await Bun.file(gz).bytes()));
          steps.gzip = { doubleRedirect, pipeForm: roundTrip === payload, bytes: { json: payload.length, gzip: Bun.file(gz).size } };
        } else {
          steps.gzip = "skipped: gzip is not on PATH";
        }

        const branch = await $`git rev-parse --abbrev-ref HEAD`.cwd(BASE_DIR).nothrow().quiet();
        steps.gitBranch = branch.exitCode === 0 ? branch.text().trim() : `(not a git checkout: exit ${branch.exitCode})`;
        try {
          await $`ls ${WORK}/does-not-exist`.quiet();
        } catch (err) {
          const e = err as { name: string; exitCode: number };
          steps.error = { name: e.name, exitCode: e.exitCode };
        }
        return Response.json(steps);
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`53 bun_shell ★ → ${server.url}script`);
  register("53", server);
}


// ========== [54] 54_fetch_extras.ts ==========
async function start54() {
  // Level: Intermediate. fetch() options that only Bun has. [59] uses fetch
  // as a reverse proxy and [78] covers timeouts, retries and streaming; this
  // one shows the transport options from bun.com's "HTTP/2, proxies, unix
  // sockets" line:
  //   unix: path        talk HTTP over a unix domain socket instead of TCP
  //                     (Docker's API, a local daemon, or [58] here). The
  //                     host in the URL is then only used for the Host header.
  //   proxy: url        send the request through an HTTP proxy. For http://
  //                     targets the proxy receives the ABSOLUTE URL in the
  //                     request line ("GET http://host/path"); for https://
  //                     targets fetch uses CONNECT and the proxy only relays
  //                     encrypted bytes.
  //   tls: { ca }       trust a specific certificate authority, e.g. your
  //                     company CA or a self-signed dev cert. This is the
  //                     correct fix for "self signed certificate" errors;
  //                     tls: { rejectUnauthorized: false } turns ALL checking
  //                     off and must never ship.
  //   decompress: false keep the body compressed (Bun otherwise decodes gzip,
  //                     br, zstd, deflate for you, see [16]).
  //   verbose: true     print request/response headers to stdout (debugging).
  // A tiny forward proxy is started on a random port to make the proxy step
  // observable: it records the request line it received.
  // Try:
  //   curl localhost:3054/report

  const proxied: string[] = [];
  const proxy = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      proxied.push(`${req.method} ${req.url}`);
      // A forward proxy repeats the request to the absolute URL it was given.
      return fetch(req.url, { method: req.method, headers: req.headers, body: req.body, redirect: "manual" });
    },
  });

  const server = Bun.serve({
    port: 3054,
    routes: {
      "/report": async () => {
        const report: Record<string, unknown> = {};
        // 한 단계가 실패해도 나머지는 계속 돌도록 결과를 report에 모은다
        const attempt = async (name: string, fn: () => Promise<unknown>) => {
          try {
            report[name] = await fn();
          } catch (err) {
            const e = err as { code?: string; message: string };
            report[name] = { error: e.code ?? e.message };
          }
        };
        await attempt("unixSocket", async () => {
          const r = await fetch("http://localhost/health", { unix: UNIX_SOCK });
          return { status: r.status, body: await r.text() };
        });
        await attempt("proxy", async () => {
          proxied.length = 0;
          const r = await fetch("http://127.0.0.1:3003/", { proxy: `http://127.0.0.1:${proxy.port}` });
          return { status: r.status, proxySaw: [...proxied] };
        });
        await attempt("tlsWithCa", async () => {
          const r = await fetch("https://localhost:3062/", { tls: { ca: DEV_TLS_CERT } });
          return { status: r.status, protocol: ((await r.json()) as { protocol: string }).protocol };
        });
        await attempt("tlsWithoutCa", async () => {
          const r = await fetch("https://localhost:3062/");
          return { status: r.status };
        });
        await attempt("decompressFalse", async () => {
          const r = await fetch("http://127.0.0.1:3016/data", { headers: { "Accept-Encoding": "gzip" }, decompress: false });
          const raw = await r.bytes();
          // gzip 데이터는 항상 1f 8b 두 바이트로 시작한다
          return { contentEncoding: r.headers.get("content-encoding"), rawBytes: raw.byteLength, gzipMagic: raw[0] === 0x1f && raw[1] === 0x8b };
        });
        return Response.json(report);
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`54 fetch_extras → ${server.url}report`);
  register("54", {
    url: server.url,
    stop: async (force?: boolean) => {
      await server.stop(force);
      await proxy.stop(true);
    },
  });
}


// ========== [55] 55_bun_secrets.ts ==========
async function start55() {
  // Level: Intermediate. Bun.secrets: store credentials in the OS keychain
  // instead of plain-text dotfiles.
  //   macOS -> Keychain, Linux -> libsecret (GNOME Keyring / KWallet),
  //   Windows -> Credential Manager. Values are encrypted at rest by the OS
  //   and tied to the logged-in user.
  // API (all async, run off the main thread):
  //   await secrets.set({ service, name, value })
  //   await secrets.get({ service, name })      -> string | null
  //   await secrets.delete({ service, name })   -> true if something was deleted
  // `service` is your app's id, `name` the credential's id.
  // Where it fits: CLIs and desktop tools (a GitHub token for your CLI,
  // instead of ~/.mytoolrc). Where it does not: servers and containers,
  // which usually have no keychain session; use environment variables or a
  // secrets manager there.
  // Because it WRITES to your real keychain (and the OS may show a prompt),
  // it only runs when you start allblue.ts with BUN_DEMO_SECRETS=1. It uses
  // service "bun-all-ts-demo" and never returns the stored value, only
  // whether it exists and its length.
  // Try:
  //   BUN_DEMO_SECRETS=1 bun allblue.ts
  //   curl -X PUT localhost:3055/secret -H 'Content-Type: application/json' -d '{"value":"ghp_example"}'
  //   curl localhost:3055/secret
  //   curl -X DELETE localhost:3055/secret

  const enabled = Bun.env.BUN_DEMO_SECRETS === "1";
  const ID = { service: "bun-all-ts-demo", name: "demo-token" };
  const needEnabled = () => {
    if (!enabled) throw new HttpError(503, "disabled: start allblue.ts with BUN_DEMO_SECRETS=1 to use the OS keychain");
  };

  const server = Bun.serve({
    port: 3055,
    routes: {
      "/": () => Response.json({ enabled, service: ID.service, name: ID.name }),
      "/secret": {
        GET: async () => {
          needEnabled();
          const value = await secrets.get(ID);
          return Response.json({ found: value !== null, length: value?.length ?? 0 });
        },
        PUT: async (req) => {
          needEnabled();
          const body = (await readJsonCapped(req, 4096)) as { value?: unknown };
          if (typeof body.value !== "string" || body.value.length < 1 || body.value.length > 1000) throw new HttpError(422, "value: 1-1000 characters");
          await secrets.set({ ...ID, value: body.value });
          return Response.json({ stored: true });
        },
        DELETE: async () => {
          needEnabled();
          return Response.json({ deleted: await secrets.delete(ID) });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`55 bun_secrets → ${server.url}  (${enabled ? "keychain enabled" : "disabled"})`);
  register("55", server);
}


// ========== [56] 56_rsa_signatures.ts ==========
// NEW in Bun 1.4.5 edition.
async function start56() {
  // Level: Intermediate. Digital signatures with node:crypto, including the
  // hashes Bun 1.4.5 fixed.
  // A signature proves who produced some bytes and that nobody changed them:
  // sign with the PRIVATE key, anyone checks it with the PUBLIC key. An HMAC
  // (the HS256 JWT in [67]) needs the same secret on both sides; a signature
  // does not, so the public key can be published (GET /public-key).
  // node:crypto (Node's API, built into Bun):
  //   generateKeyPairSync("rsa", { modulusLength: 2048 })  -> { publicKey, privateKey }
  //   sign(alg, data, privateKey)           -> Buffer, the signature
  //   verify(alg, data, publicKey, sig)     -> boolean
  //   sign(alg, data, { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength })
  //                                         RSA-PSS instead of PKCS#1 v1.5
  // `alg` is the hash that is signed. sha256 is the usual choice. Before Bun
  // 1.4.5, an RSA key with sha3-256/384/512, sha512-224, sha512-256 or
  // ripemd160 threw ERR_OSSL_RSA_UNKNOWN_ALGORITHM_TYPE; 1.4.5 accepts them
  // as Node.js does. You meet them when another system dictates the hash:
  // SHA-3 in newer standards, RIPEMD-160 in older PGP-era formats.
  // GET /algorithms signs and verifies once with every hash and shows
  // which ones this Bun supports.
  // PKCS#1 v1.5 signatures are deterministic (same input -> same bytes).
  // PSS mixes in a random salt: two signatures differ, both verify. Prefer
  // PSS for new designs, PKCS#1 v1.5 when a format requires it (JWT RS256).
  // The key pair is made at start-up and lives only in memory. A real app
  // loads its private key from a secret store ([55] Bun.secrets, or the
  // environment), never from git.
  // Try:
  //   curl localhost:3056/algorithms
  //   curl localhost:3056/public-key
  //   curl -X POST 'localhost:3056/sign?alg=sha3-256' --data-binary 'hello'
  //   curl -X POST 'localhost:3056/sign?alg=sha3-256&pss=1' --data-binary 'hello'
  //   curl -X POST localhost:3056/verify -H 'Content-Type: application/json' \
  //     -d '{"alg":"sha3-256","data":"hello","signature":"<signature from /sign>"}'

  const nodeCrypto = await import("node:crypto");
  // RSA 키 생성은 꽤 느려서 시작할 때 한 번만 만든다
  const { privateKey, publicKey } = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const ALGS = ["sha256", "sha384", "sha512", "sha512-224", "sha512-256", "sha3-256", "sha3-384", "sha3-512", "ripemd160"];
  const FIXED_IN_145 = new Set(["sha512-224", "sha512-256", "sha3-256", "sha3-384", "sha3-512", "ripemd160"]);
  const MAX_BYTES = 64 * 1024;

  const checkAlg = (value: unknown): string => {
    if (typeof value !== "string" || !ALGS.includes(value)) throw new HttpError(422, `alg must be one of: ${ALGS.join(", ")}`);
    return value;
  };
  // The key argument decides the padding: a bare KeyObject means PKCS#1 v1.5.
  const withPadding = <K>(key: K, pss: boolean) =>
    pss ? { key, padding: nodeCrypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: nodeCrypto.constants.RSA_PSS_SALTLEN_DIGEST } : key;

  const server = Bun.serve({
    port: 3056,
    routes: {
      "/algorithms": () => {
        const probe = Buffer.from("probe");
        const results = ALGS.map((alg) => {
          try {
            const sig = nodeCrypto.sign(alg, probe, privateKey);
            return { alg, ok: nodeCrypto.verify(alg, probe, publicKey, sig), fixedIn145: FIXED_IN_145.has(alg) };
          } catch (err) {
            // On Bun 1.4.4 and older the FIXED_IN_145 hashes end up here.
            return { alg, ok: false, fixedIn145: FIXED_IN_145.has(alg), error: (err as { code?: string }).code ?? (err as Error).message };
          }
        });
        return Response.json({ bun: Bun.version, keyBits: 2048, results });
      },
      "/public-key": () =>
        // spki는 공개키 표준 형식, pem은 그걸 base64 텍스트로 감싼 것
        new Response(publicKey.export({ type: "spki", format: "pem" }), {
          headers: { "Content-Type": "application/x-pem-file" },
        }),
      "/sign": {
        POST: async (req) => {
          const alg = checkAlg(qp(req, "alg") ?? "sha256");
          const pss = qp(req, "pss") === "1";
          if (Number(req.headers.get("content-length")) > MAX_BYTES) throw new HttpError(413, `body is larger than ${MAX_BYTES} bytes`);
          const data = new Uint8Array(await req.arrayBuffer());
          if (data.byteLength > MAX_BYTES) throw new HttpError(413, `body is larger than ${MAX_BYTES} bytes`);
          const signature = nodeCrypto.sign(alg, data, withPadding(privateKey, pss));
          return Response.json({ alg, padding: pss ? "pss" : "pkcs1", bytes: data.byteLength, signature: signature.toString("base64url") });
        },
      },
      "/verify": {
        POST: async (req) => {
          const body = (await readJsonCapped(req, MAX_BYTES * 2)) as { alg?: unknown; data?: unknown; signature?: unknown; pss?: unknown };
          const alg = checkAlg(body.alg);
          if (typeof body.data !== "string" || typeof body.signature !== "string") throw new HttpError(422, "data and signature (base64url) must be strings");
          // base64url: + / 대신 - _ 를 써서 URL에 그대로 넣을 수 있는 base64
          const signature = Buffer.from(body.signature, "base64url");
          // verify() returns false for a wrong signature; it does not throw.
          const valid = nodeCrypto.verify(alg, Buffer.from(body.data), withPadding(publicKey, body.pss === true), signature);
          return Response.json({ alg, valid });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`56 rsa_signatures → ${server.url}algorithms`);
  register("56", server);
}


// ############################################################################
// ############################################################################
//
//   ADVANCED  [57]-[81]  (25 examples)
//
// ############################################################################
// ############################################################################

// ========== [57] 57_reload.ts ==========
// Level: Advanced. Hot-swapping handlers with server.reload().
// reload() replaces routes/fetch/error while keeping the port and the open
// connections. Pass the complete set of handlers: it is a replacement, not
// a merge. Values on globalThis survive `bun --hot` module re-evaluation.
async function start57() {
  // 57. server.reload — 포트 유지한 채 핸들러 교체
  // 실행: bun 57_reload.ts
  // 확인:
  //   curl http://localhost:3057/api/version   # v1
  //   # 3초 후 자동 reload
  //   curl http://localhost:3057/api/version   # v2
  //
  // bun --hot 과 병행 시: globalThis 상태는 프로세스에 남음

  const g = globalThis as typeof globalThis & { __reloadCount?: number };
  // ??= : 값이 없을 때만 넣는다. 핫 리로드돼도 숫자가 유지된다
  g.__reloadCount ??= 0;

  const server = Bun.serve({
    port: 3057,
    routes: {
      "/api/version": () =>
        Response.json({
          version: "1.0.0",
          reloadCount: g.__reloadCount,
        }),
      "/": () =>
        new Response("GET /api/version — 3초 뒤 v2 로 reload 됩니다\n"),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`57 reload → ${server.url} (v1)`);

  setTimeout(() => {
    g.__reloadCount = (g.__reloadCount ?? 0) + 1;
    server.reload({
      routes: {
        "/api/version": () =>
          Response.json({
            version: "2.0.0",
            reloadCount: g.__reloadCount,
            note: "server.reload 로 교체됨",
          }),
        "/": () => new Response("이제 v2 입니다\n"),
      },
      fetch() {
        return new Response("Not Found", { status: 404 });
      },
    });
    console.log("→ reloaded to v2 (port unchanged)");
  }, 3000);
    push("57", server);

}


// ========== [58] 58_unix.ts ==========
// Level: Advanced. Unix domain socket.
// No TCP port: clients connect through a file. Faster than loopback TCP
// and protected by file permissions; typical behind nginx on one machine.
// A stale socket file from a crash makes listen fail, hence the unlink
// first. Bun's fetch can call it with fetch(url, { unix: sock }).
async function start58() {
  // 58. Unix domain socket — 리버스 프록시 뒤 로컬 통신
  // 실행: bun --hot 58_unix.ts
  // 확인:
  //   curl --unix-socket /tmp/allblue.sock http://localhost/
  //   (macOS/Linux curl 지원)

  const sock = UNIX_SOCK; // see the shared helpers

  try {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(sock);
  } catch {
    // 없으면 무시
  }

  const server = Bun.serve({
    unix: sock,
    routes: {
      "/": () =>
        Response.json({
          ok: true,
          via: "unix",
          tip: `curl --unix-socket ${sock} http://localhost/`,
        }),
      "/health": new Response("OK"),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`58 unix → unix:${sock}`);
  // server.url 은 unix 모드에서 의미가 다를 수 있음
  void server;
    push("58", server);

}


// ========== [59] 59_proxy.ts ==========
// Level: Advanced. Reverse proxy with fetch().
// Only the path and query are forwarded and the upstream host is fixed, so
// a client cannot make the server call arbitrary hosts (no SSRF). Request
// headers such as Cookie and Authorization are deliberately not forwarded.
// Verified on 1.4.4: fetch() decompresses gzip and reports the decompressed
// Content-Length, so copying that header is safe.
// Needs internet access for /proxy/*; /local works offline.
async function start59() {
  // 59. 리버스 프록시 — fetch 결과를 그대로 전달
  // 실행: bun --hot 59_proxy.ts
  // 확인:
  //   curl -i http://localhost:3059/proxy/get
  //   curl -i http://localhost:3059/proxy/status/418
  //
  // 업스트림: https://httpbin.org  (네트워크 필요)
  // 오프라인 테스트용 /local 도 제공

  const UPSTREAM = "https://httpbin.org";

  const server = Bun.serve({
    port: 3059,
    routes: {
      "/": () =>
        new Response(
          "GET /proxy/* → httpbin.org 로 프록시\nGET /local → 로컬 에코 (오프라인용)\n",
        ),
      "/local": () =>
        Response.json({ via: "local", message: "프록시 없이 로컬 응답" }),
      "/proxy/*": async (req) => {
        const url = new URL(req.url);
        // /proxy/get → https://httpbin.org/get
        const path = url.pathname.replace(/^\/proxy/, "") || "/";
        const target = `${UPSTREAM}${path}${url.search}`;

        try {
          const upstream = await fetch(target, {
            method: req.method,
            headers: {
              accept: req.headers.get("accept") ?? "*/*",
            },
            // GET/HEAD는 본문이 없어야 해서 undefined
            body:
              req.method === "GET" || req.method === "HEAD"
                ? undefined
                : await req.arrayBuffer(),
            // manual: 리다이렉트를 따라가지 않고 그대로 클라이언트에 넘긴다
            redirect: "manual",
          });

          // 응답 헤더 일부만 전달
          const headers = new Headers();
          const pass = ["content-type", "content-length", "cache-control"];
          for (const key of pass) {
            const v = upstream.headers.get(key);
            if (v) headers.set(key, v);
          }
          headers.set("X-Proxied-From", target);

          // 본문을 다 받지 않고 스트림째로 넘긴다
          return new Response(upstream.body, {
            status: upstream.status,
            headers,
          });
        } catch (err) {
          return Response.json(
            {
              error: "upstream unreachable",
              detail: err instanceof Error ? err.message : String(err),
              tip: "오프라인이면 GET /local 사용",
            },
            { status: 502 },
          );
        }
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`59 proxy → ${server.url}`);
    push("59", server);

}


// ========== [60] 60_timeout.ts ==========
// Level: Advanced. idleTimeout and server.timeout().
async function start60() {
  // 60. idleTimeout · server.timeout — 요청별 타임아웃 제어
  // 실행: bun --hot 60_timeout.ts
  // 확인:
  //   curl -m 5 http://localhost:3060/fast          # 즉시
  //   curl -m 5 http://localhost:3060/slow-ok       # timeout(req,0) → 완료
  //   curl -m 5 http://localhost:3060/slow-default  # 기본 idle 에 걸릴 수 있음
  //
  // 서버 기본 idleTimeout 을 2초로 낮춰 차이를 보기 쉽게 함

  const server = Bun.serve({
    port: 3060,
    idleTimeout: 2, // 초 (HTTP 유휴). 기본은 10, 최대 255, 0=비활성
    routes: {
      "/": () =>
        new Response(
          [
            "GET /fast",
            "GET /slow-ok       — server.timeout(req, 0) 후 3초 대기",
            "GET /slow-default — timeout 미설정, idleTimeout=2 에 끊길 수 있음",
            "",
          ].join("\n"),
        ),
      "/fast": () => Response.json({ ok: true }),
      "/slow-ok": async (req, srv) => {
        // 이 요청만 유휴 타임아웃 비활성
        srv.timeout(req, 0);
        await Bun.sleep(3000);
        return Response.json({ ok: true, waitedMs: 3000, timeout: "disabled" });
      },
      // Observed on 1.4.4: the outcome is NOT deterministic. Run alone, this
      // route usually completes (200 after 3 s). Inside the full self-test
      // run it was reset with ECONNRESET about 1.35 s in, every time. On reused
      // keep-alive connections fetch() sometimes retried it silently (4 s
      // instead of 3 s). So the Korean comment above is right: it CAN be cut.
      // /slow-ok, which calls srv.timeout(req, 0), completed in every run.
      // Rule: a handler that may take longer than idleTimeout must call
      // server.timeout(req, 0) (or a larger value), like /slow-ok does.
      "/slow-default": async () => {
        // idleTimeout(2s) 동안 응답이 없으면 연결이 끊길 수 있음
        await Bun.sleep(3000);
        return Response.json({ ok: true, waitedMs: 3000 });
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`60 timeout → ${server.url} (idleTimeout=2s)`);
    push("60", server);

}


// ========== [61] 61_export_default.ts ==========
// Level: Advanced. Route priority.
// Bun matches: exact path > :param > /prefix/* > /*, independent of the
// order in the object. With a "/*" route, fetch() is effectively
// unreachable for normal requests.
async function start61() {
  // 61. export default · 와일드카드 라우트 · 우선순위
  // 실행: bun 61_export_default.ts
  //   (또는: bun --hot 61_export_default.ts)
  // 확인:
  //   curl http://localhost:3061/
  //   curl http://localhost:3061/api/users/me     # exact 우선
  //   curl http://localhost:3061/api/users/42     # :id
  //   curl http://localhost:3061/api/other        # /api/*
  //   curl http://localhost:3061/anything         # /*

  // 맨 끝의 satisfies: 옵션 타입은 검사하되 추론된 타입은 그대로 둔다
  const server = Bun.serve({
    port: 3061,
    routes: {
      "/": () =>
        Response.json({
          tip: [
            "exact > param > wildcard > global",
            "/api/users/me",
            "/api/users/:id",
            "/api/*",
            "/*",
          ],
        }),
      // 1) Exact
      "/api/users/me": () => Response.json({ user: "current" }),
      // 2) Parameter
      "/api/users/:id": (req) => Response.json({ userId: req.params.id }),
      // 3) Wildcard
      "/api/*": (req) => {
        const url = new URL(req.url);
        return Response.json({ catch: "api", path: url.pathname });
      },
      // 4) Global catch-all
      "/*": (req) => {
        const url = new URL(req.url);
        return Response.json({ catch: "global", path: url.pathname }, { status: 404 });
      },
    },
    fetch() {
      // routes 의 /* 가 대부분 잡음. 여기까지 오면 진짜 미매칭
      return new Response("fallback", { status: 404 });
    },
  } satisfies Serve.Options<undefined>);

  console.log(`61 export_default → ${server.url}`);
    push("61", server);

}


// ========== [62] 62_tls.ts ==========
// Level: Advanced. HTTPS.
// tls.key / tls.cert accept a BunFile, a string or a Buffer. The private key
// must never be committed to git. Since 1.4.4, client certificates (mTLS)
// are requested only with requestCert: true; `ca` alone no longer does it.
async function start62() {
  // 62. TLS / HTTPS — 자체 서명 인증서
  // 실행: bun --hot 62_tls.ts
  // 확인:
  //   curl -k https://localhost:3062/
  //   브라우저: https://localhost:3062/  (경고 무시 — 개발용 인증서)
  //
  // 인증서: ./_certs/{key,cert}.pem
  // 재발급: openssl req -x509 -newkey rsa:2048 -nodes \
  //   -keyout _certs/key.pem -out _certs/cert.pem -days 365 \
  //   -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

  const CERT_DIR = `${BASE_DIR}/_certs`;
  await ensureDevCert(CERT_DIR); // UPDATED: creates _certs/*.pem if missing

  const server = Bun.serve({
    port: 3062,
    tls: {
      // 경로 문자열이 아니라 BunFile / 내용
      key: Bun.file(`${CERT_DIR}/key.pem`),
      cert: Bun.file(`${CERT_DIR}/cert.pem`),
    },
    routes: {
      "/": () =>
        Response.json({
          ok: true,
          protocol: "https",
          tip: "curl -k https://localhost:3062/",
        }),
      "/whoami": (req, srv) =>
        Response.json({
          url: req.url,
          ip: srv.requestIP(req)?.address ?? null,
        }),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`62 tls → ${server.url}  (curl -k ${server.url})`);
    push("62", server);

}


// ========== [63] 63_tls_cert_errors.ts ==========
// NEW in Bun 1.4.5 edition.
async function start63() {
  // Level: Advanced. Why did the TLS handshake fail?
  // When fetch() or node:tls rejects a server's certificate, the error has
  // a `code` naming the reason. Each reason has a different fix, so log the
  // code (never just "TLS failed"), and never "fix" it with
  // rejectUnauthorized: false:
  //   CERT_HAS_EXPIRED               the cert's notAfter date has passed.
  //                                  Fix: renew it (or fix the clock).
  //   DEPTH_ZERO_SELF_SIGNED_CERT    self-signed and not trusted by this client.
  //                                  Fix: trust that cert explicitly with `ca`.
  //   UNABLE_TO_VERIFY_LEAF_SIGNATURE, UNABLE_TO_GET_ISSUER_CERT_LOCALLY
  //                                  the issuing CA is unknown, or the server
  //                                  does not send its intermediate certs.
  //   ERR_TLS_CERT_ALTNAME_INVALID   a valid cert, but for another host name.
  // What Bun 1.4.5 (a security release) changed here:
  //   - An EXPIRED cert from an UNKNOWN issuer now reports CERT_HAS_EXPIRED,
  //     as Node.js does, so the real problem is no longer hidden behind a
  //     "not trusted" code. Trusting the cert with `ca` does not help: the
  //     date is checked anyway (cases 1 and 2 below).
  //   - Custom root certificates passed with `ca` are validated more
  //     strictly, and some legacy ones are now rejected (Bun's bundled
  //     roots are not affected). If a private CA stopped working after the
  //     upgrade, inspect it with `openssl x509 -text -noout -in ca.pem` and
  //     re-issue it.
  //   - allowPartialTrustChain together with crl now needs the chain to end
  //     at a self-issued certificate, as in Node.js.
  //   - BoringSSL, lsquic (HTTP/3, [64]) and c-ares (DNS) were updated.
  // This example starts two throwaway HTTPS servers on random ports, bound
  // to 127.0.0.1: one with an EXPIRED certificate (embedded below; it was
  // valid for one day in January 2020) and one with the dev certificate of
  // [62]. GET /check connects to them six ways and reports what each client
  // saw. With rejectUnauthorized: false the connection succeeds, and
  // node:tls still says WHY it is untrusted in socket.authorizationError:
  // fine for a diagnostic tool like this one, wrong for anything else.
  // GET /certs reads both certificates with node:crypto's X509Certificate.
  // Try:
  //   curl localhost:3063/check
  //   curl localhost:3063/certs

  // An EC P-256 pair made for this example with
  //   openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
  //     -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
  //     -not_before 20200101000000Z -not_after 20200102000000Z
  // Its private key is public on purpose: it is expired and useless.
  const EXPIRED_TLS_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgpUAsvTHKXc10hQAT
URKC6yV8Z7P1Ifkqd6vjLBNKpsqhRANCAAQAd138CMVccD5zjz/uRWHa106tHXjW
3xGH/IQPq7W8b2+HJw8z/nyRTgMqsoJTH6Mmwm88Ap/RV7BX3TJCbCFK
-----END PRIVATE KEY-----
`;
  const EXPIRED_TLS_CERT = `-----BEGIN CERTIFICATE-----
MIIBmTCCAT+gAwIBAgIUO/N5k2nDjHzf8l+zit4DqapH0FswCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTIwMDEwMTAwMDAwMFoXDTIwMDEwMjAw
MDAwMFowFDESMBAGA1UEAwwJbG9jYWxob3N0MFkwEwYHKoZIzj0CAQYIKoZIzj0D
AQcDQgAEAHdd/AjFXHA+c48/7kVh2tdOrR141t8Rh/yED6u1vG9vhycPM/58kU4D
KrKCUx+jJsJvPAKf0VewV90yQmwhSqNvMG0wHQYDVR0OBBYEFFV1rVp3Ufv3s8go
tliWO/lAamTVMB8GA1UdIwQYMBaAFFV1rVp3Ufv3s8gotliWO/lAamTVMA8GA1Ud
EwEB/wQFMAMBAf8wGgYDVR0RBBMwEYIJbG9jYWxob3N0hwR/AAABMAoGCCqGSM49
BAMCA0gAMEUCIDV1o0TmCKxthqUrQfSnK0Lg6lL/VjJSmewwyScsilfRAiEA3YRW
VoVcUXp47HnEJGm2im8gSkycKw20N3PXZ+t3mhA=
-----END CERTIFICATE-----
`;

  const tls = await import("node:tls");
  const { X509Certificate } = await import("node:crypto");

  const hello = (text: string) => () => new Response(text);
  // port 0: 비어 있는 포트를 OS가 골라 준다
  const expired = Bun.serve({ port: 0, hostname: "127.0.0.1", tls: { key: EXPIRED_TLS_KEY, cert: EXPIRED_TLS_CERT }, fetch: hello("expired cert") });
  const selfSigned = Bun.serve({ port: 0, hostname: "127.0.0.1", tls: { key: DEV_TLS_KEY, cert: DEV_TLS_CERT }, fetch: hello("self-signed cert") });

  type Outcome =
    | { ok: true; status?: number; authorized?: boolean; authorizationError?: string | null }
    | { ok: false; code: string; message: string };
  const failure = (err: unknown): Outcome => {
    const e = err as { code?: string; name?: string; message?: string };
    return { ok: false, code: e.code ?? e.name ?? "Error", message: e.message ?? String(err) };
  };
  // authorizationError is an Error in Node.js and may be a string elsewhere.
  const reason = (x: unknown) => (x == null ? null : typeof x === "string" ? x : ((x as { code?: string }).code ?? String(x)));

  async function viaFetch(port: number, tlsOptions: Record<string, unknown>): Promise<Outcome> {
    try {
      // AbortSignal.timeout: 3초 안에 안 끝나면 저절로 취소된다
      const res = await fetch(`https://127.0.0.1:${port}/`, { tls: tlsOptions, signal: AbortSignal.timeout(3000) } as RequestInit);
      await res.arrayBuffer();
      return { ok: true, status: res.status };
    } catch (err) {
      return failure(err);
    }
  }
  function viaTls(port: number, servername: string, options: Record<string, unknown>): Promise<Outcome> {
    return new Promise((resolve) => {
      // servername은 SNI. 인증서의 호스트 이름도 이 값으로 검사한다
      const socket = tls.connect({ host: "127.0.0.1", port, servername, ...options }, () => {
        resolve({ ok: true, authorized: socket.authorized, authorizationError: reason(socket.authorizationError) });
        socket.end();
      });
      socket.once("error", (err) => resolve(failure(err)));
      socket.setTimeout(3000, () => {
        socket.destroy();
        resolve({ ok: false, code: "ETIMEDOUT", message: "no TLS handshake within 3 s" });
      });
    });
  }

  const describeCert = (pem: string) => {
    const x = new X509Certificate(pem);
    return {
      subject: x.subject,
      subjectAltName: x.subjectAltName,
      validFrom: new Date(x.validFrom).toISOString(),
      validTo: new Date(x.validTo).toISOString(),
      expired: Date.now() > Date.parse(x.validTo),
      selfIssued: x.subject === x.issuer,
      fingerprint256: x.fingerprint256,
    };
  };

  const server = Bun.serve({
    port: 3063,
    routes: {
      "/check": async () => {
        const cases = {
          "1 expired, not trusted (fetch)": { expect: "CERT_HAS_EXPIRED", got: await viaFetch(expired.port, {}) },
          "2 expired, trusted with ca (fetch)": { expect: "CERT_HAS_EXPIRED", got: await viaFetch(expired.port, { ca: EXPIRED_TLS_CERT }) },
          "3 self-signed, not trusted (fetch)": { expect: "DEPTH_ZERO_SELF_SIGNED_CERT", got: await viaFetch(selfSigned.port, {}) },
          "4 self-signed, trusted with ca (fetch)": { expect: "200", got: await viaFetch(selfSigned.port, { ca: DEV_TLS_CERT }) },
          "5 trusted, wrong host name (node:tls)": { expect: "ERR_TLS_CERT_ALTNAME_INVALID", got: await viaTls(selfSigned.port, "wrong.example", { ca: DEV_TLS_CERT }) },
          "6 expired, rejectUnauthorized: false (node:tls)": {
            expect: "connected, authorizationError CERT_HAS_EXPIRED",
            got: await viaTls(expired.port, "localhost", { rejectUnauthorized: false }),
          },
        };
        return Response.json({ bun: Bun.version, cases });
      },
      "/certs": () => Response.json({ expired: describeCert(EXPIRED_TLS_CERT), devCert: describeCert(DEV_TLS_CERT) }),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`63 tls_cert_errors → ${server.url}check  (expired cert on :${expired.port}, self-signed on :${selfSigned.port})`);
  register("63", {
    url: server.url,
    stop: async (force?: boolean) => {
      await Promise.all([expired.stop(force), selfSigned.stop(force)]);
      return server.stop(force);
    },
  });
}


// ========== [64] 64_http3.ts ==========
// Level: Advanced. HTTP/3 (experimental).
// HTTP/3 runs over QUIC (UDP) on the same port number as the TCP listener.
// Requires TLS. Most curl builds lack --http3-only; plain HTTPS still works.
async function start64() {
  // 64. HTTP/3 (실험적) — TLS 필수, 같은 포트 TCP+UDP
  // 실행: bun --hot 64_http3.ts
  // 확인:
  //   curl -k --http3-only https://localhost:3064/     # curl 이 HTTP/3 지원할 때
  //   curl -k https://localhost:3064/                  # HTTP/1.1 로도 응답 (http1 기본 on)
  //
  // 주의: Unix 소켓과 함께 쓸 수 없음 (QUIC=UDP)

  const CERT_DIR = `${BASE_DIR}/_certs`;
  await ensureDevCert(CERT_DIR); // UPDATED: creates _certs/*.pem if missing

  const server = Bun.serve({
    port: 3064,
    tls: {
      key: Bun.file(`${CERT_DIR}/key.pem`),
      cert: Bun.file(`${CERT_DIR}/cert.pem`),
    },
    http3: true,
    // http1: false, // 켜면 HTTP/3 만
    routes: {
      "/": (req) =>
        Response.json({
          ok: true,
          http3: true,
          // 클라이언트가 실제로 h3 로 왔는지는 프록시/환경에 따라 다름
          url: req.url,
        }),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`64 http3 → ${server.url}`);
  console.log("  try: curl -k --http3-only " + server.url);
    push("64", server);

}


// ========== [65] 65_html_import.ts ==========
// ★ IMPORTANT — first step towards the official bun.com sample "Frontend"; full version: [80].
// Level: Advanced. HTML import (full-stack bundling).
// `import homepage from "./index.html"` makes Bun bundle the page's
// <script>/<link> files when the server starts. With development: true you
// get source maps and browser hot reload; production uses `bun build`.
async function start65() {
  // 65. HTML import — 풀스택 번들 + bun --hot 브라우저 HMR
  // 실행: bun --hot 65_html_import.ts
  // 확인: 브라우저 http://localhost:3065/
  //       _html_import/app.ts 를 수정·저장하면 브라우저가 자동 갱신(HMR)
  //
  // 인라인 HTML 문자열과 달리, HTML 파일 import 는 Bun 번들러를 탄다.

  // UPDATED: the page used to be a static top-level import, which made the
  // whole file fail to start if _html_import/ was missing. Now the two
  // source files are embedded here, written only if missing, and loaded
  // with a dynamic import(). Bun treats a dynamically imported .html file
  // exactly like a static one: the default export is an HTMLBundle, and
  // Bun.serve bundles its <script src="./app.ts"> on first request
  // (verified on 1.4.4). Because existing files are kept, editing
  // _html_import/app.ts under `bun --hot` still triggers browser HMR.
  // The browser code lives in a string, so it no longer needs DOM types in
  // this project's type check.
  const PAGE_DIR = `${BASE_DIR}/_html_import`;
  await writeIfMissing(`${PAGE_DIR}/index.html`, `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HTML Import</title>
  <style>
    body {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: #0f1115;
      color: #e8eaed;
    }
    #count { font-size: 3rem; font-weight: 600; }
    button {
      margin-top: 1rem;
      padding: 0.6rem 1.2rem;
      border: 0;
      background: #3b82f6;
      color: white;
      font-size: 1rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main>
    <p>HTML import + bun --hot → 브라우저 HMR</p>
    <div id="count">0</div>
    <button id="inc">+1</button>
  </main>
  <script type="module" src="./app.ts"></script>
</body>
</html>
`);
  await writeIfMissing(`${PAGE_DIR}/app.ts`, `// bun --hot 로 돌리면 이 파일 수정 시 브라우저 HMR
const el = document.getElementById("count")!;
const btn = document.getElementById("inc")!;

let n = 0;
const render = () => {
  el.textContent = String(n);
};

btn.addEventListener("click", () => {
  n += 1;
  render();
});

render();
console.log("[app.ts] loaded — 이 파일을 저장하면 HMR");
`);
  const { default: homepage } = await import(`${PAGE_DIR}/index.html`);

  const server = Bun.serve({
    port: 3065,
    routes: {
      // HTMLBundle을 그대로 라우트에 주면 Bun이 번들링해서 서빙한다
      "/": homepage,
      "/api/time": () => Response.json({ now: Date.now() }),
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
    development: true,
  });

  console.log(`65 html_import → ${server.url}`);
  console.log("  edit _html_import/app.ts then save → browser HMR");
    push("65", server);

}


// ========== [66] 66_ws_advanced.ts ==========
// Level: Advanced. WebSocket backpressure.
// ws.send() returns the bytes sent, -1 if queued because the client reads
// slowly (backpressure), or 0 if dropped. drain() fires when the queue
// empties. cork() batches several sends into one network write.
async function start66() {
  // 66. WebSocket 고급 — perMessageDeflate · 백프레셔 · cork · data
  // 실행: bun --hot 66_ws_advanced.ts
  // 확인: 브라우저 http://localhost:3066/

  type WsData = { id: string; joinedAt: number };

  const html = `<!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>WS Advanced</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 2rem; }
      #log { white-space: pre-wrap; background: #f4f4f5; padding: 1rem; height: 14rem; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>WS Advanced</h1>
    <button id="burst">100개 연속 전송 (백프레셔 관찰)</button>
    <pre id="log"></pre>
    <script>
      const log = document.getElementById("log");
      const ws = new WebSocket("ws://" + location.host + "/ws");
      ws.binaryType = "arraybuffer";
      ws.onmessage = (e) => {
        log.textContent += (typeof e.data === "string" ? e.data : "[bin " + e.data.byteLength + "]") + "\\n";
      };
      document.getElementById("burst").onclick = () => {
        for (let i = 0; i < 100; i++) ws.send("burst-" + i);
      };
    </script>
  </body>
  </html>`;

  const server = Bun.serve({
    port: 3066,
    routes: {
      "/": () =>
        new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    },
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        const ok = srv.upgrade(req, {
          data: {
            id: crypto.randomUUID().slice(0, 8),
            joinedAt: Date.now(),
          } satisfies WsData,
        });
        return ok ? undefined : new Response("Upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      data: {} as WsData,
      // 메시지를 압축해서 주고받는다. 텍스트가 많을 때 효과가 크다
      perMessageDeflate: true,
      idleTimeout: 60,
      maxPayloadLength: 1024 * 1024,
      // 못 보내고 쌓인 데이터가 이만큼 넘으면 백프레셔 상태
      backpressureLimit: 1024 * 1024,
      // false: 한도를 넘어도 연결은 끊지 않는다
      closeOnBackpressureLimit: false,
      open(ws) {
        ws.send(`welcome ${ws.data.id}`);
      },
      message(ws, message) {
        // cork: 여러 send 를 한 번에 플러시
        ws.cork((socket) => {
          const status = socket.send(`echo: ${message}`, true); // compress
          // status: -1 큐잉(백프레셔), 0 드롭, 1+ 전송 바이트
          if (status === -1) {
            socket.send("(server backpressure)");
          }
        });
      },
      drain(ws) {
        // 백프레셔 해소 시
        ws.send("(drain: backpressure cleared)");
      },
    },
  });

  console.log(`66 ws_advanced → ${server.url}`);
    push("66", server);

}


// ========== [67] 67_jwt.ts ==========
// Level: Advanced. JWT (HS256) with Web Crypto only.
// A JWT is base64url(header).base64url(payload).base64url(signature).
// Anyone can READ the payload; the signature only proves it was not
// changed. Never put secrets in it.
async function start67() {
  // 67. JWT (HMAC-SHA256) — Web Crypto만 사용, npm 0
  // 실행: bun --hot 67_jwt.ts
  // 확인:
  //   TOKEN=$(curl -s -X POST http://localhost:3067/login \
  //     -H 'Content-Type: application/json' -d '{"sub":"ada"}' | bun -e 'console.log((await Bun.stdin.json()).token)')
  //   curl -i http://localhost:3067/secret -H "Authorization: Bearer $TOKEN"

  const SECRET = "dev-only-change-me";

  function b64url(data: ArrayBuffer | string): string {
    const bytes =
      typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    // base64의 + / 를 - _ 로 바꾸고 끝의 = 패딩은 뗀다
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64urlJson(obj: unknown): string {
    return b64url(JSON.stringify(obj));
  }

  async function hmacKey() {
    // 문자열 비밀키를 Web Crypto가 쓰는 CryptoKey로 바꾼다
    return crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }

  async function signJwt(payload: Record<string, unknown>, expiresInSec = 3600) {
    const header = { alg: "HS256", typ: "JWT" };
    const body = {
      ...payload,
      // 초 단위 유닉스 시간. iat는 발급 시각, exp는 만료 시각
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSec,
    };
    const h = b64urlJson(header);
    const p = b64urlJson(body);
    const key = await hmacKey();
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${h}.${p}`),
    );
    return `${h}.${p}.${b64url(sig)}`;
  }

  function fromB64url(s: string): Uint8Array<ArrayBuffer> { // FIXED type: crypto.subtle needs an ArrayBuffer-backed view
    // 떼어 냈던 = 패딩을 길이가 4의 배수가 되게 다시 붙인다
    const pad = "=".repeat((4 - (s.length % 4)) % 4);
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  }

  async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // The header's "alg" is ignored and HS256 is always used: correct, because
    // trusting alg from the token enables the "alg: none" attack.
    // crypto.subtle.verify compares in constant time.
    // FIXED: garbage input (bad base64, non-JSON payload) made atob() or
    // JSON.parse throw -> 500. Any such failure now means "invalid token".
    const [h, p, s] = parts;
    let payload: Record<string, unknown>;
    try {
      const key = await hmacKey();
      const ok = await crypto.subtle.verify(
        "HMAC",
        key,
        fromB64url(s!),
        new TextEncoder().encode(`${h}.${p}`),
      );
      if (!ok) return null;
      payload = JSON.parse(
        new TextDecoder().decode(fromB64url(p!)),
      ) as Record<string, unknown>;
    } catch {
      return null;
    }
    if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  }

  const server = Bun.serve({
    port: 3067,
    routes: {
      "/": () =>
        new Response("POST /login {sub} → GET /secret (Bearer JWT)\n"),
      "/login": {
        POST: async (req) => {
          const body = (await req.json()) as { sub?: string };
          if (!body.sub?.trim()) {
            return Response.json({ error: "sub required" }, { status: 400 });
          }
          const token = await signJwt({ sub: body.sub.trim() }, 60 * 60);
          return Response.json({ token, token_type: "Bearer" });
        },
      },
      "/secret": {
        GET: async (req) => {
          const auth = req.headers.get("authorization") ?? "";
          const m = /^Bearer\s+(.+)$/i.exec(auth);
          if (!m) return new Response("Unauthorized", { status: 401 });
          const payload = await verifyJwt(m[1]!);
          if (!payload) return new Response("Invalid token", { status: 401 });
          return Response.json({ ok: true, payload });
        },
      },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`67 jwt → ${server.url}`);
    push("67", server);

}


// ========== [68] 68_mini_app.ts ==========
// Level: Advanced. An Express-style mini framework (MiniFramework above).
// app.listen() wraps Bun.serve({ fetch }) and matches routes in JavaScript.
// Native `routes` ([04], [05]) match in C++ and are faster; a wrapper like
// this trades speed for a familiar API.
async function start68() {
  // 68. Express식 미니 프레임워크 — app.get/post + 미들웨어 + :id
  // 실행: bun --hot 68_mini_app.ts
  // 확인:
  //   curl http://localhost:3068/
  //   curl http://localhost:3068/api/users
  //   curl -X POST http://localhost:3068/api/users \
  //     -H 'Content-Type: application/json' -d '{"name":"lin"}'
  //   curl http://localhost:3068/api/users/<id>

  type User = { id: string; name: string };
  const users: User[] = [{ id: "1", name: "ada" }];

  const app = mini();

  app.use(async (req, _res, next) => {
    const t = performance.now();
    await next();
    console.log(
      `${req.method} ${req.path} ${(performance.now() - t).toFixed(1)}ms`,
    );
  });

  app.get("/", (_req, res) => {
    res.json({ tip: ["GET /api/users", "POST /api/users", "GET /api/users/:id"] });
  });

  app.get("/api/users", (_req, res) => {
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    // req.raw가 원래 Request 객체
    const body = (await req.raw.json()) as { name?: string };
    if (!body.name?.trim()) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const user = { id: crypto.randomUUID().slice(0, 8), name: body.name.trim() };
    users.push(user);
    res.status(201).json(user);
  });

  app.get("/api/users/:id", (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(user);
  });

  const server = app.listen(3068);
  console.log(`68 mini_app → ${server.url}`);
    push("68", server);

}


// ========== [69] 69_production.ts ==========
// Level: Advanced. Everything together: REST + session + SQLite + WS.
async function start69() {
  // 69. 실전 통합 — REST + 쿠키세션 + WS pub/sub + metrics + graceful
  // 실행: bun --hot 69_production.ts
  // 확인:
  //   curl http://localhost:3069/health
  //   curl -c /tmp/p.txt -b /tmp/p.txt -X POST http://localhost:3069/api/login \
  //     -H 'Content-Type: application/json' -d '{"user":"ada"}'
  //   curl -c /tmp/p.txt -b /tmp/p.txt http://localhost:3069/api/me
  //   브라우저: http://localhost:3069/

  type WsData = { user: string; room: string };

  const dbPath = `${BASE_DIR}/_data/prod.db`;
  await Bun.write(`${BASE_DIR}/_data/.keep`, "");
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const sessions = new Map<string, string>(); // sid → user
  const insertNote = db.query(
    `INSERT INTO notes (id, user, body, created_at) VALUES (?, ?, ?, ?)`,
  );
  const listNotes = db.query(
    `SELECT * FROM notes WHERE user = ? ORDER BY created_at DESC`,
  );

  const html = `<!DOCTYPE html>
  <html lang="ko"><head><meta charset="UTF-8" /><title>Prod Demo</title>
  <style>body{font-family:system-ui;padding:2rem}#log{background:#f4f4f5;padding:1rem;height:10rem;overflow:auto;white-space:pre-wrap}</style>
  </head><body>
  <h1>통합 데모</h1>
  <p>REST + session cookie + WS room</p>
  <pre id="log"></pre>
  <input id="msg" /><button id="send">WS send</button>
  <script>
    const log=document.getElementById("log");
    // FIXED: the socket now needs a session, so the page logs in first.
    let ws;
    fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user:"guest"})}).then(()=>{
    ws=new WebSocket("ws://"+location.host+"/ws?room=lobby");
    ws.onmessage=e=>{log.textContent+=e.data+"\\n"};
    });
    document.getElementById("send").onclick=()=>ws.send(document.getElementById("msg").value);
  </script>
  </body></html>`;

  const server = Bun.serve({
    port: 3069,
    development: false,
    maxRequestBodySize: 1024 * 1024, // 1MB — 초과 시 자동 413
    routes: {
      "/": () =>
        new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      "/health": Response.json({ ok: true }),
      "/metrics": (_req, srv) =>
        Response.json({
          pendingRequests: srv.pendingRequests,
          pendingWebSockets: srv.pendingWebSockets,
          sessions: sessions.size,
        }),
      "/api/login": {
        POST: async (req) => {
          const body = (await req.json()) as { user?: string };
          if (!body.user?.trim()) {
            return Response.json({ error: "user required" }, { status: 400 });
          }
          const sid = crypto.randomUUID();
          sessions.set(sid, body.user.trim());
          req.cookies.set("sid", sid, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
          });
          return Response.json({ ok: true, user: body.user.trim() });
        },
      },
      "/api/me": (req) => {
        const sid = req.cookies.get("sid");
        const user = sid ? sessions.get(sid) : undefined;
        if (!user) return new Response("Unauthorized", { status: 401 });
        return Response.json({ user });
      },
      "/api/notes": {
        GET: (req) => {
          const sid = req.cookies.get("sid");
          const user = sid ? sessions.get(sid) : undefined;
          if (!user) return new Response("Unauthorized", { status: 401 });
          return Response.json(listNotes.all(user));
        },
        POST: async (req) => {
          const sid = req.cookies.get("sid");
          const user = sid ? sessions.get(sid) : undefined;
          if (!user) return new Response("Unauthorized", { status: 401 });
          const body = (await req.json()) as { body?: string };
          if (!body.body?.trim()) {
            return Response.json({ error: "body required" }, { status: 400 });
          }
          const id = crypto.randomUUID();
          const created_at = new Date().toISOString();
          insertNote.run(id, user, body.body.trim(), created_at);
          return Response.json(
            { id, user, body: body.body.trim(), created_at },
            { status: 201 },
          );
        },
      },
    },
    // FIXED (was: user and room taken from the query string, no session
    // check, so anyone could chat as anyone). The upgrade now reads the sid
    // cookie, looks up the session and uses THAT user name; no session ->
    // 401 before the upgrade. Browsers send cookies on the WebSocket
    // handshake automatically. The room name is validated too.
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        // fetch()로 온 요청에는 req.cookies가 없어서 Cookie 헤더를 직접 파싱한다
        const sid = new Bun.CookieMap(req.headers.get("cookie") ?? "").get("sid");
        const user = sid ? sessions.get(sid) : undefined;
        if (!user) return new Response("Unauthorized: POST /api/login first", { status: 401 });
        const room = url.searchParams.get("room") ?? "lobby";
        if (!/^[a-z0-9-]{1,32}$/.test(room)) return new Response("Bad room", { status: 400 });
        const ok = srv.upgrade(req, {
          data: { user, room } satisfies WsData,
        });
        return ok ? undefined : new Response("Upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      data: {} as WsData,
      open(ws) {
        ws.subscribe(ws.data.room);
        server.publish(ws.data.room, `* ${ws.data.user} joined`);
      },
      message(ws, message) {
        server.publish(ws.data.room, `${ws.data.user}: ${message}`);
      },
      close(ws) {
        ws.unsubscribe(ws.data.room);
        server.publish(ws.data.room, `* ${ws.data.user} left`);
      },
    },
    error(err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  // FIXED: shutdown() was never called in the merged file, so db.close()
  // never ran. The registered stop() now stops the server AND closes the
  // database, and shutdownAll() calls it. (register() is defined in the
  // extended section; function declarations are hoisted.)
  console.log(`69 production → ${server.url}`);
  register("69", {
    url: server.url,
    stop: async (force?: boolean) => {
      await server.stop(force);
      db.close();
    },
  });

}


// ========== [70] 70_hardening.ts ==========
// Level: Advanced. Hardening switches.
// development: false disables Bun's HTML error page; maxRequestBodySize is
// enforced in native code while the body arrives, before any JS runs
// (the default is 128 MB).
async function start70() {
  // 70. maxRequestBodySize · development:false — 프로덕션 하드닝 포인트
  // 실행: bun --hot 70_hardening.ts
  // 확인:
  //   curl -i -X POST http://localhost:3070/echo -H 'Content-Type: text/plain' -d 'hi'
  //   # 큰 바디 → 413 (핸들러 도달 전 자동)
  //   dd if=/dev/zero bs=1024 count=20 2>/dev/null | \
  //     curl -i -X POST http://localhost:3070/echo \
  //       -H 'Content-Type: application/octet-stream' --data-binary @-

  const server = Bun.serve({
    port: 3070,
    development: false, // 내장 에러 페이지 비활성 (프로덕션 권장)
    maxRequestBodySize: 8 * 1024, // 8KB — 초과 시 자동 413
    routes: {
      "/": () =>
        new Response(
          [
            "POST /echo  (max body 8KB)",
            "development: false",
            "error() 커스텀 JSON",
            "",
          ].join("\n"),
        ),
      "/echo": {
        POST: async (req) => {
          const buf = await req.arrayBuffer();
          return Response.json({
            bytes: buf.byteLength,
            note: "8KB 넘기면 여기까지 도달하지 않음 (413)",
          });
        },
      },
      "/boom": () => {
        throw new Error("prod error");
      },
    },
    fetch() {
      return Response.json({ error: "Not Found" }, { status: 404 });
    },
    error(err) {
      // development:false 여도 error 콜백은 동작
      console.error("[error]", err);
      return Response.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    },
  });

  console.log(`70 hardening → ${server.url}`);
    push("70", server);

}


// ========== [71] 71_ws_publish.ts ==========
// Level: Advanced. server.publish vs ws.publish.
// server.publish -> every subscriber, sender included.
// ws.publish     -> every subscriber EXCEPT the sending socket (chat style).
async function start71() {
  // 71. ws.publish vs server.publish
  // 실행: bun --hot 71_ws_publish.ts
  // 확인: 브라우저 탭 2개
  //   http://localhost:3071/?user=ada
  //   http://localhost:3071/?user=bob
  //
  // | API | 수신자 |
  // |---|---|
  // | server.publish(topic, msg) | 토픽 구독자 **전원** (보낸 사람 포함) |
  // | ws.publish(topic, msg)     | 토픽 구독자 중 **본인 제외** |

  type WsData = { user: string };

  const TOPIC = "demo";

  const html = `<!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>publish 비교</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 2rem; max-width: 36rem; }
      #log { height: 14rem; overflow: auto; background: #f4f4f5; padding: 1rem; white-space: pre-wrap; }
      .row { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
      button { padding: 0.5rem 0.75rem; cursor: pointer; }
      code { background: #e4e4e7; padding: 0.1rem 0.35rem; }
    </style>
  </head>
  <body>
    <h1>publish 비교</h1>
    <p id="meta"></p>
    <p>
      <code>server</code> = 전원(나 포함) ·
      <code>ws</code> = 남만(나는 안 받음)
    </p>
    <pre id="log"></pre>
    <div class="row">
      <button id="serverPub">server.publish</button>
      <button id="wsPub">ws.publish</button>
    </div>
    <script>
      const user = new URLSearchParams(location.search).get("user") || "anon";
      document.getElementById("meta").textContent = "나: " + user + "  (다른 탭을 하나 더 여세요)";
      const log = document.getElementById("log");
      const ws = new WebSocket("ws://" + location.host + "/ws?user=" + encodeURIComponent(user));
      ws.onmessage = (e) => {
        log.textContent += e.data + "\\n";
        log.scrollTop = log.scrollHeight;
      };
      document.getElementById("serverPub").onclick = () => ws.send(JSON.stringify({ mode: "server" }));
      document.getElementById("wsPub").onclick = () => ws.send(JSON.stringify({ mode: "ws" }));
    </script>
  </body>
  </html>`;

  const server = Bun.serve({
    port: 3071,
    routes: {
      "/": () =>
        new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    },
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        const ok = srv.upgrade(req, {
          data: { user: url.searchParams.get("user") ?? "anon" } satisfies WsData,
        });
        return ok ? undefined : new Response("Upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      data: {} as WsData,
      open(ws) {
        ws.subscribe(TOPIC);
        // 입장 알림은 전원에게 (본인 포함)
        server.publish(TOPIC, `* ${ws.data.user} joined (subscribers=${server.subscriberCount(TOPIC)})`);
      },
      message(ws, raw) {
        let mode = "server";
        try {
          mode = (JSON.parse(String(raw)) as { mode?: string }).mode ?? "server";
        } catch {
          /* plain text → server */
        }

        if (mode === "ws") {
          // 본인 제외 → 보낸 탭 로그에는 안 뜸 (다른 탭만)
          ws.publish(TOPIC, `[ws.publish] ${ws.data.user} → others only`);
          // 보낸 사람에게만 로컬 확인용
          ws.send(`[local] ws.publish 호출함 (나는 토픽으로 안 받음)`);
        } else {
          // 전원 → 보낸 탭에도 동일 메시지 수신
          server.publish(TOPIC, `[server.publish] ${ws.data.user} → everyone`);
        }
      },
      close(ws) {
        ws.unsubscribe(TOPIC);
        server.publish(TOPIC, `* ${ws.data.user} left`);
      },
    },
  });

  console.log(`71 ws_publish → ${server.url}?user=ada`);
  console.log(`  다른 탭: ${server.url}?user=bob`);
    push("71", server);

}


// ========== [72] 72_jobs_sse.ts ==========
async function start72() {
  // Level: Advanced. Background jobs: 202 Accepted + polling + SSE push.
  // Some work is too slow for one request. The asynchronous pattern:
  //   POST /jobs        -> 202 Accepted + Location: /jobs/<id>  ("not done yet")
  //   the work runs in a queue in the background
  //   GET  /jobs/<id>   -> poll the status (Retry-After hints how long to wait)
  //   GET  /events      -> or get PUSHED every status change over SSE
  // The queue runs at most CONCURRENCY jobs at a time; the rest wait.
  // That stops 100 simultaneous requests from starting 100 CPU-heavy
  // jobs at once. `void promise.finally(...)` = start it, do not await
  // it here, but always free the slot, even if the job throws.
  // The job hashes a string `rounds` times (SHA-256 chain) and yields to
  // the event loop every 5 000 rounds with `await Bun.sleep(0)`, so the
  // server keeps answering other requests while it works.
  // SSE cleanup: when the client disconnects, req.signal fires and the
  // listener is removed; otherwise every closed tab leaks one listener.
  // Try:
  //   curl -N localhost:3072/events &
  //   curl -X POST localhost:3072/jobs -H 'Content-Type: application/json' -d '{"rounds":200000}'

  type Job = { id: string; status: "queued" | "running" | "done" | "failed"; rounds: number; result?: string; error?: string; createdAt: string; finishedAt?: string };
  const CONCURRENCY = 2;
  const jobs = new Map<string, Job>();
  const queue: Job[] = [];
  let running = 0;
  const listeners = new Set<(job: Job) => void>();
  const update = (job: Job, patch: Partial<Job>) => {
    Object.assign(job, patch);
    // 복사본을 넘겨서 리스너가 원본 job을 못 건드리게
    for (const fn of listeners) fn({ ...job });
  };

  async function work(job: Job) {
    update(job, { status: "running" });
    try {
      let h = job.id;
      for (let i = 0; i < job.rounds; i++) {
        h = sha256hex(h);
        if (i % 5000 === 4999) await Bun.sleep(0); // let other requests in
      }
      update(job, { status: "done", result: h, finishedAt: new Date().toISOString() });
    } catch (err) {
      update(job, { status: "failed", error: (err as Error).message, finishedAt: new Date().toISOString() });
    }
  }
  function pump() {
    while (running < CONCURRENCY && queue.length) {
      const job = queue.shift()!;
      running++;
      void work(job).finally(() => {
        running--;
        pump();
      });
    }
  }

  const server = Bun.serve({
    port: 3072,
    routes: {
      "/jobs": {
        POST: async (req) => {
          const body = (await readJsonCapped(req, 1024)) as { rounds?: unknown };
          const rounds = body.rounds ?? 10_000;
          if (!Number.isInteger(rounds) || (rounds as number) < 1 || (rounds as number) > 2_000_000) {
            throw new HttpError(422, "validation failed", [{ field: "rounds", message: "integer 1..2000000" }]);
          }
          const job: Job = { id: Bun.randomUUIDv7(), status: "queued", rounds: rounds as number, createdAt: new Date().toISOString() };
          jobs.set(job.id, job);
          queue.push(job);
          for (const fn of listeners) fn({ ...job });
          pump();
          // 202: 접수는 했고 아직 안 끝났다는 뜻
          return Response.json(job, { status: 202, headers: { Location: `/jobs/${job.id}` } });
        },
      },
      "/jobs/:id": (req) => {
        const job = jobs.get(req.params.id);
        if (!job) throw new HttpError(404, "job not found");
        const pending = job.status === "queued" || job.status === "running";
        return Response.json(job, { headers: pending ? { "Retry-After": "1" } : {} });
      },
      "/events": (req, srv) => {
        srv.timeout(req, 0); // a quiet SSE stream must not hit idleTimeout
        const enc = new TextEncoder();
        let cleanup = () => {};
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            const onJob = (job: Job) => send("job", job);
            // ':'로 시작하는 줄은 SSE 주석. 연결이 끊기지 않게 가끔 보낸다
            const heartbeat = setInterval(() => controller.enqueue(enc.encode(": keep-alive\n\n")), 15_000);
            listeners.add(onJob);
            cleanup = () => {
              listeners.delete(onJob);
              clearInterval(heartbeat);
              try {
                controller.close();
              } catch {}
            };
            req.signal.addEventListener("abort", () => cleanup(), { once: true });
            send("hello", { listeners: listeners.size });
          },
          cancel: () => cleanup(),
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
      },
      "/stats": () => Response.json({ queued: queue.length, running, known: jobs.size, sseListeners: listeners.size }),
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`72 jobs_sse → ${server.url}`);
  register("72", server);
}


// ========== [73] 73_ws_rpc.ts ==========
async function start73() {
  // Level: Advanced. A real protocol on top of WebSocket.
  // (a) RPC WITH IDS. Replies, pushes and other replies share one socket
  //     and can arrive in any order, so each request carries an id:
  //       -> {"id":7,"method":"add","params":{"a":1,"b":2}}
  //       <- {"type":"rpc","id":7,"ok":true,"result":3}
  //     The client resolves the matching promise by id ([78] shows it).
  // (b) ROOMS. A room is a topic "room:<name>". room.say uses
  //     ws.publish, which skips the sender ([71] explains the difference).
  // (c) BINARY FRAMES arrive as Buffer instead of string; the server
  //     answers with their size and SHA-256 (no base64, no +33%).
  // (d) RATE LIMIT with a token bucket per socket: up to 10 tokens,
  //     refilled 10 per second, one per message. Bursts are fine, floods get
  //     429. The refill is computed lazily on each message: no timers.
  //     Compare with the fixed window in [34].
  // Errors reuse HTTP status codes (400, 404, 422, 429) so HTTP and WS
  // clients speak the same language.

  type D = { id: string; tokens: number; refilledAt: number; rooms: Set<string> };
  const RATE = { capacity: 10, perSecond: 10 };
  const ROOM = /^[a-z0-9-]{1,32}$/;

  function takeToken(d: D): boolean {
    const now = performance.now(); // monotonic clock
    // 지난번 이후 흐른 시간만큼 토큰을 채운다 (capacity까지만)
    d.tokens = Math.min(RATE.capacity, d.tokens + ((now - d.refilledAt) / 1000) * RATE.perSecond);
    d.refilledAt = now;
    if (d.tokens < 1) return false;
    d.tokens -= 1;
    return true;
  }
  const room = (p: Record<string, unknown>) => {
    if (typeof p.room !== "string" || !ROOM.test(p.room)) throw new HttpError(422, "room: [a-z0-9-]{1,32}");
    return p.room;
  };

  const methods: Record<string, (ws: Bun.ServerWebSocket<D>, p: Record<string, unknown>) => unknown> = {
    ping: () => ({ pong: Date.now() }),
    add: (_ws, p) => {
      if (typeof p.a !== "number" || typeof p.b !== "number") throw new HttpError(422, "a and b must be numbers");
      return p.a + p.b;
    },
    "room.join": (ws, p) => {
      const r = room(p);
      ws.subscribe(`room:${r}`);
      ws.data.rooms.add(r);
      return { room: r, members: server.subscriberCount(`room:${r}`) };
    },
    "room.say": (ws, p) => {
      const r = room(p);
      if (!ws.data.rooms.has(r)) throw new HttpError(403, `join ${r} first`);
      if (typeof p.text !== "string" || !p.text || p.text.length > 500) throw new HttpError(422, "text: 1..500 characters");
      ws.publish(`room:${r}`, JSON.stringify({ type: "chat", room: r, from: ws.data.id, text: p.text }));
      // 보낸 사람은 못 받으니 1을 뺀다
      return { delivered: server.subscriberCount(`room:${r}`) - 1 };
    },
  };

  const reply = (ws: Bun.ServerWebSocket<D>, data: unknown) => void ws.send(JSON.stringify(data));

  const server = Bun.serve({
    port: 3073,
    routes: {
      "/": () => new Response(`WebSocket at /ws. Methods: ${Object.keys(methods).join(", ")}. Binary frames -> sha256.\n`),
      "/ws": (req, srv) =>
        srv.upgrade(req, { data: { id: Bun.randomUUIDv7(), tokens: RATE.capacity, refilledAt: performance.now(), rooms: new Set<string>() } })
          ? undefined
          : new Response("expected a WebSocket upgrade", { status: 426 }),
    },
    fetch: () => new Response("Not Found", { status: 404 }),
    websocket: {
      data: {} as D,
      maxPayloadLength: 1024 * 1024,
      open(ws) {
        reply(ws, { type: "hello", id: ws.data.id, methods: Object.keys(methods) });
      },
      async message(ws, message) {
        if (typeof message !== "string") {
          if (!takeToken(ws.data)) return reply(ws, { type: "error", status: 429, error: "rate limited" });
          // Buffer가 가리키는 구간만 보는 뷰. 복사가 없다
          const bytes = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
          return reply(ws, { type: "binary", size: bytes.byteLength, sha256: sha256hex(bytes) });
        }
        let msg: { id?: unknown; method?: unknown; params?: unknown };
        try {
          msg = JSON.parse(message);
        } catch {
          return reply(ws, { type: "error", status: 400, error: "send JSON" });
        }
        const id = typeof msg.id === "number" || typeof msg.id === "string" ? msg.id : null;
        if (!takeToken(ws.data)) return reply(ws, { type: "rpc", id, ok: false, error: { status: 429, message: "rate limited" } });
        try {
          if (id === null || typeof msg.method !== "string") throw new HttpError(400, 'send {"id":1,"method":"...","params":{}}');
          const fn = methods[msg.method];
          if (!fn) throw new HttpError(404, `unknown method ${msg.method}`);
          const params = msg.params && typeof msg.params === "object" && !Array.isArray(msg.params) ? (msg.params as Record<string, unknown>) : {};
          reply(ws, { type: "rpc", id, ok: true, result: await fn(ws, params) });
        } catch (err) {
          const e = err instanceof HttpError ? err : new HttpError(500, "internal error");
          reply(ws, { type: "rpc", id, ok: false, error: { status: e.status, message: e.message } });
        }
      },
    },
  });

  console.log(`73 ws_rpc → ${server.url.href.replace("http", "ws")}ws`);
  register("73", server);
}


// ========== [74] 74_image_service.ts ==========
async function start74() {
  // Level: Advanced. Image processing with Bun.Image (no sharp, no npm).
  // Bun.Image is lazy: new Bun.Image(bytes).resize(...).webp() only records
  // steps; `await .bytes()` runs decode -> resize -> encode once, on a
  // background thread, so the JS thread keeps serving requests.
  //   metadata()   reads only the header: width, height, format. Cheap.
  //   maxPixels    refuses "decompression bombs" (a tiny file that declares
  //                50000 x 50000 pixels would need ~10 GB to decode).
  // Never trust the extension or Content-Type: the format is detected
  // from the bytes, and anything that is not an image gets 415.
  // /image/strip decodes and RE-ENCODES the image. The new file contains
  // only pixels + minimal headers, so EXIF (GPS, camera, time), text chunks
  // and data appended after the image end are all gone. Verified on 1.4.4:
  // the EXIF Orientation is APPLIED to the pixels first, so photos do not
  // end up sideways. GIF cannot be re-encoded (Bun.Image has no gif()).
  // Try:
  //   curl --data-binary @photo.jpg localhost:3074/image/info
  //   curl --data-binary @photo.jpg 'localhost:3074/image/thumb?w=128' -o thumb.webp

  const MAX_PIXELS = 25_000_000;
  const hasExif = (b: Uint8Array) => Buffer.from(b).includes("Exif\0\0");

  async function load(req: Request) {
    const bytes = await req.bytes();
    if (bytes.byteLength === 0) throw new HttpError(400, "send the image bytes as the request body");
    try {
      const meta = await new Bun.Image(bytes, { maxPixels: MAX_PIXELS }).metadata();
      return { bytes, meta };
    } catch (err) {
      throw new HttpError(415, `not a supported image: ${(err as Error).message}`);
    }
  }

  const server = Bun.serve({
    port: 3074,
    maxRequestBodySize: 8 * 1024 * 1024,
    routes: {
      "/image/info": {
        POST: async (req) => {
          const { bytes, meta } = await load(req);
          return Response.json({ ...meta, bytes: bytes.byteLength, hasExif: hasExif(bytes), sha256: sha256hex(bytes) });
        },
      },
      "/image/thumb": {
        POST: async (req) => {
          const { bytes } = await load(req);
          const w = Math.min(1024, Math.max(16, Number(qp(req, "w")) || 128));
          const format = qp(req, "format") ?? "webp";
          // inside: 비율 유지한 채 w×w 안에 맞추고, 작은 이미지는 키우지 않는다
          let img = new Bun.Image(bytes, { maxPixels: MAX_PIXELS }).resize(w, w, { fit: "inside", withoutEnlargement: true });
          if (format === "webp") img = img.webp({ quality: 75 });
          else if (format === "jpeg") img = img.jpeg({ quality: 80 });
          else if (format === "png") img = img.png();
          else throw new HttpError(400, "format: webp | jpeg | png");
          return new Response(await img.bytes(), { headers: { "Content-Type": `image/${format}` } });
        },
      },
      "/image/strip": {
        POST: async (req) => {
          const { bytes, meta } = await load(req);
          const img = new Bun.Image(bytes, { maxPixels: MAX_PIXELS });
          let out: Uint8Array;
          if (meta.format === "png") out = await img.png().bytes();
          else if (meta.format === "jpeg") out = await img.jpeg({ quality: 92 }).bytes();
          else if (meta.format === "webp") out = await img.webp({ quality: 90 }).bytes();
          else throw new HttpError(415, `cannot re-encode ${meta.format}`);
          return new Response(out, {
            headers: {
              "Content-Type": `image/${meta.format}`,
              "X-Had-Exif": String(hasExif(bytes)),
              "X-Has-Exif": String(hasExif(out)),
              "X-Original-Bytes": String(bytes.byteLength),
            },
          });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`74 image_service → ${server.url}`);
  register("74", server);
}


// ========== [75] 75_vault.ts ==========
async function start75() {
  // Level: Advanced. A one-folder file exchange: the rules from
  // ../server/server.ts, condensed into one example.
  //   THE RULE: this example touches only ./_vault, flat (no sub-folders),
  //   and only .log / .png / .jpg / .jpeg / .webp files may live there.
  // How each rule is enforced:
  //   - Names: ONE allow-list regex, no "/" in it, first char a letter or
  //     digit (no "..", no hidden files). Allow-lists also block tricks
  //     nobody thought of; deny-lists do not.
  //   - Content, not extension: a .log must be valid UTF-8 (TextDecoder
  //     fatal: true) with no control characters except tab/newline (blocks
  //     binaries and terminal-escape injection); an image must decode and
  //     its real format must match the extension.
  //   - Images are re-encoded ([74]) so EXIF/GPS and hidden payloads are
  //     never stored.
  //   - Quota: total bytes. The check and the reservation happen in one
  //     synchronous block (no await between them). JS is single-threaded,
  //     so no other upload can sneak in between: no race.
  //   - Downloads: ETag = SHA-256 (304 on If-None-Match), Content-Type set
  //     by us, X-Content-Type-Options: nosniff so browsers never guess.
  // Try:
  //   curl -X PUT localhost:3075/files/app.log --data-binary $'line 1\nline 2\n'
  //   curl -X PUT localhost:3075/files/evil.sh --data-binary 'x'     -> 400
  //   curl -X PUT localhost:3075/files/fake.png --data-binary 'x'    -> 415

  const DIR = `${BASE_DIR}/_vault`;
  await $`mkdir -p ${DIR}`.quiet();
  const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.(log|png|jpe?g|webp)$/;
  const FORMAT: Record<string, string> = { png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp" };
  const LIMIT = { log: 1024 * 1024, image: 4 * 1024 * 1024 };
  const QUOTA = 8 * 1024 * 1024;
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  // 탭과 줄바꿈(\n, \r)만 빼고 나머지 제어 문자
  // eslint-disable-next-line no-control-regex
  const CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
  let pendingBytes = 0;

  function check(name: string) {
    const m = NAME.exec(name);
    if (!m || name.includes("..")) throw new HttpError(400, `name "${name}" is not allowed`);
    const ext = m[1]!.toLowerCase();
    return { ext, kind: ext === "log" ? ("log" as const) : ("image" as const) };
  }
  async function usedBytes(): Promise<number> {
    let total = 0;
    for await (const n of new Bun.Glob("*").scan({ cwd: DIR, onlyFiles: true })) total += Bun.file(`${DIR}/${n}`).size;
    return total;
  }

  const server = Bun.serve({
    port: 3075,
    maxRequestBodySize: 6 * 1024 * 1024,
    routes: {
      "/files": async () => {
        const out = [];
        for await (const n of new Bun.Glob("*").scan({ cwd: DIR, onlyFiles: true, followSymlinks: false })) {
          if (NAME.test(n)) out.push({ name: n, size: Bun.file(`${DIR}/${n}`).size });
        }
        return Response.json({ files: out.sort((a, b) => a.name.localeCompare(b.name)), usedBytes: await usedBytes(), quota: QUOTA });
      },
      "/files/:name": {
        PUT: async (req) => {
          const name = req.params.name;
          const { ext, kind } = check(name);
          const bytes = await req.bytes();
          if (bytes.byteLength === 0) throw new HttpError(400, "empty file");
          if (bytes.byteLength > LIMIT[kind]) throw new HttpError(413, `${kind} limit is ${LIMIT[kind]} bytes`);

          let stored: Uint8Array = bytes;
          if (kind === "log") {
            let text: string;
            try {
              text = utf8.decode(bytes);
            } catch {
              throw new HttpError(415, "a .log must be valid UTF-8");
            }
            if (CONTROL.test(text)) throw new HttpError(415, "control characters are not allowed in a .log");
          } else {
            let format: string;
            try {
              format = (await new Bun.Image(bytes, { maxPixels: 25_000_000 }).metadata()).format;
            } catch {
              throw new HttpError(415, "not a valid image");
            }
            if (format !== FORMAT[ext]) throw new HttpError(415, `content is ${format}, extension says ${FORMAT[ext]}`);
            const img = new Bun.Image(bytes, { maxPixels: 25_000_000 });
            stored = format === "png" ? await img.png().bytes() : format === "jpeg" ? await img.jpeg({ quality: 92 }).bytes() : await img.webp({ quality: 90 }).bytes();
          }

          const path = `${DIR}/${name}`;
          const existing = (await Bun.file(path).exists()) ? Bun.file(path).size : 0;
          const used = await usedBytes();
          // ---- check and reserve: NO await between these two steps ----
          const add = stored.byteLength - existing;
          if (used + pendingBytes + add > QUOTA) throw new HttpError(507, `vault full: ${QUOTA - used - pendingBytes} bytes free`);
          pendingBytes += add;
          try {
            await Bun.write(path, stored);
          } finally {
            pendingBytes -= add;
          }
          return Response.json(
            { name, size: stored.byteLength, sha256: sha256hex(stored), originalSha256: sha256hex(bytes), reencoded: stored !== bytes },
            { status: existing ? 200 : 201 },
          );
        },
        GET: async (req) => {
          const name = req.params.name;
          const { kind, ext } = check(name);
          const file = Bun.file(`${DIR}/${name}`);
          if (!(await file.exists())) throw new HttpError(404, `${name} not found`);
          const etag = `"${sha256hex(await file.bytes())}"`;
          const headers = { ETag: etag, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" };
          if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
          const type = kind === "log" ? "text/plain; charset=utf-8" : `image/${FORMAT[ext]}`;
          return new Response(file, { headers: { ...headers, "Content-Type": type } });
        },
        DELETE: async (req) => {
          check(req.params.name);
          const file = Bun.file(`${DIR}/${req.params.name}`);
          if (!(await file.exists())) throw new HttpError(404, "not found");
          await file.delete();
          return new Response(null, { status: 204 });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`75 vault → ${server.url}files`);
  register("75", server);
}


// ========== [76] 76_workers.ts ==========
async function start76() {
  // Level: Advanced. CPU work on other threads with Worker.
  // JavaScript runs your handlers on ONE thread. A CPU-heavy loop there
  // blocks every other request until it finishes. A Worker is a second
  // JS thread with its own event loop; postMessage() sends it data
  // (structured clone), and it posts results back.
  // The worker code is built from a Blob URL here so the example stays in
  // one file; normally you write `new Worker(new URL("./w.ts", import.meta.url))`.
  // A small pool (2 workers) is reused: starting a worker costs a few ms.
  // Each request gets an id so replies can be matched (same idea as the
  // WebSocket RPC in [73]).
  // Try (two terminals):
  //   curl 'localhost:3076/hash/main?rounds=300000'  & curl localhost:3076/ping   (ping waits)
  //   curl 'localhost:3076/hash/worker?rounds=300000' & curl localhost:3076/ping  (ping is instant)

  const src = `
    self.onmessage = (e) => {
      const { id, seed, rounds } = e.data;
      let h = seed;
      for (let i = 0; i < rounds; i++) h = new Bun.CryptoHasher("sha256").update(h).digest("hex");
      postMessage({ id, hash: h });
    };`;
  // 코드 문자열을 파일처럼 쓸 수 있는 blob: 주소로 만든다
  const url = URL.createObjectURL(new Blob([src], { type: "application/javascript" }));
  const pool = [new Worker(url), new Worker(url)];
  const waiting = new Map<number, (hash: string) => void>();
  let seq = 0;
  // 답장에 붙은 id로 기다리던 Promise를 찾아 풀어 준다
  for (const w of pool) w.onmessage = (e: MessageEvent<{ id: number; hash: string }>) => {
    waiting.get(e.data.id)?.(e.data.hash);
    waiting.delete(e.data.id);
  };
  const onWorker = (seed: string, rounds: number) =>
    new Promise<string>((resolve) => {
      const id = ++seq;
      waiting.set(id, resolve);
      // id로 번갈아 가며 워커에 나눠 준다 (라운드 로빈)
      pool[id % pool.length]!.postMessage({ id, seed, rounds });
    });
  const onMain = (seed: string, rounds: number) => {
    let h = seed;
    for (let i = 0; i < rounds; i++) h = sha256hex(h);
    return h;
  };
  const roundsOf = (req: Request) => Math.min(2_000_000, Math.max(1, Number(qp(req, "rounds")) || 100_000));

  const server = Bun.serve({
    port: 3076,
    routes: {
      "/ping": () => Response.json({ ok: true, at: Date.now() }),
      "/hash/main": (req) => {
        const t0 = performance.now();
        const hash = onMain("seed", roundsOf(req));
        return Response.json({ hash, ms: Math.round(performance.now() - t0), thread: "main (blocked everything)" });
      },
      "/hash/worker": async (req) => {
        const t0 = performance.now();
        const hash = await onWorker("seed", roundsOf(req));
        return Response.json({ hash, ms: Math.round(performance.now() - t0), thread: "worker" });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`76 workers → ${server.url}`);
  register("76", {
    url: server.url,
    stop: async (force?: boolean) => {
      for (const w of pool) w.terminate();
      URL.revokeObjectURL(url);
      await server.stop(force);
    },
  });
}


// ========== [77] 77_tcp_udp.ts ==========
async function start77() {
  // Level: Advanced. Raw TCP and UDP (no HTTP): Bun.listen / Bun.udpSocket.
  // TCP is a STREAM of bytes with no message boundaries: one write("ab")
  // may arrive as "a" + "b", and two writes may arrive glued together. So
  // a protocol needs framing; here: one message per line ("\n"). Each
  // socket keeps its own unfinished line in socket.data.
  // UDP sends separate DATAGRAMS: boundaries are kept, but delivery and
  // order are not guaranteed, and there is no connection.
  // Both listen on port 3077 (TCP and UDP ports are separate spaces).
  // Try:
  //   printf 'hello\nquit\n' | nc 127.0.0.1 3077        (TCP: uppercased lines)
  //   echo -n ping | nc -u -w1 127.0.0.1 3077           (UDP echo)

  const tcp = Bun.listen<{ buf: string }>({
    hostname: "127.0.0.1",
    port: 3077,
    socket: {
      open(socket) {
        socket.data = { buf: "" };
        socket.write("hello from the TCP line server\n");
      },
      data(socket, chunk) {
        socket.data.buf += chunk.toString();
        let nl: number;
        while ((nl = socket.data.buf.indexOf("\n")) >= 0) {
          const line = socket.data.buf.slice(0, nl).replace(/\r$/, "");
          socket.data.buf = socket.data.buf.slice(nl + 1);
          if (line === "quit") {
            socket.end("bye\n");
            return;
          }
          socket.write(line.toUpperCase() + "\n");
        }
        if (socket.data.buf.length > 64 * 1024) socket.end("line too long\n"); // framing needs a limit too
      },
      error(_socket, err) {
        console.error("[77] tcp error", err.message);
      },
    },
  });

  const udp = await Bun.udpSocket({
    hostname: "127.0.0.1",
    port: 3077,
    socket: {
      // UDP는 연결이 없어서 받을 때마다 보낸 쪽 주소가 같이 온다
      data(socket, buf, port, addr) {
        socket.send(`echo:${buf.toString()}`, port, addr);
      },
    },
  });

  console.log(`77 tcp_udp → tcp://127.0.0.1:${tcp.port} + udp://127.0.0.1:${udp.port}`);
  register("77", {
    url: new URL(`tcp://127.0.0.1:${tcp.port}`),
    stop: () => {
      tcp.stop(true);
      udp.close();
    },
  });
}


// ========== [78] 78_client_patterns.ts ==========
async function start78() {
  // Level: Advanced. The CLIENT side: everything a program that calls
  // APIs needs. GET /run executes each pattern against the other example
  // servers and returns a JSON report (also used by the self-test).
  //   parallel      Promise.all: total time = slowest, not the sum
  //   allSettled    every outcome, never throws
  //   timeout       AbortSignal.timeout(ms) -> "TimeoutError"
  //   abort         AbortController -> "AbortError"; the server sees it ([42])
  //   retry         exponential backoff + jitter, only for 5xx/429/network;
  //                 only for idempotent requests (GET/PUT/DELETE)
  //   paging        follow nextCursor with an async generator ([39])
  //   ndjson        JSONL.parseChunk on a streamed body ([41]); keeps the
  //                 unfinished tail of each chunk for the next one
  //   sse           parse "event:/data:" blocks from a fetch stream ([72])
  //   wsRpc         WebSocket calls matched to replies by id ([73])
  // Important: fetch() does NOT throw on 404/500, only when there is no
  // answer at all. Always look at res.ok / res.status.
  // Try: curl localhost:3078/run

  const base = (port: number) => `http://127.0.0.1:${port}`;

  async function withRetry(attempt: () => Promise<Response>, retries = 4, baseMs = 30): Promise<{ res: Response; attempts: number }> {
    for (let n = 1; ; n++) {
      let res: Response | undefined;
      let error: unknown;
      try {
        res = await attempt();
      } catch (err) {
        error = err;
      }
      const temporary = error !== undefined || res!.status === 429 || res!.status >= 500;
      if (!temporary || n > retries) {
        if (error) throw error;
        return { res: res!, attempts: n };
      }
      await res?.body?.cancel(); // free the connection, we will not read it
      const retryAfter = Number(res?.headers.get("retry-after")) * 1000;
      // 기다리는 시간을 1, 2, 4배로 늘리고 랜덤을 섞어 재시도가 한꺼번에 몰리지 않게
      await Bun.sleep(retryAfter > 0 ? retryAfter : baseMs * 2 ** (n - 1) * (0.5 + Math.random()));
    }
  }

  // async 제너레이터: 페이지를 받아 오는 대로 하나씩 내보낸다
  async function* pages(limit: number): AsyncGenerator<{ id: number }> {
    let cursor: number | null = 0;
    while (cursor !== null) {
      const r = (await (await fetch(`${base(3039)}/api/notes?limit=${limit}&cursor=${cursor}`)).json()) as { items: { id: number }[]; nextCursor: number | null };
      // yield*: 배열 항목을 하나씩 꺼내서 내보낸다
      yield* r.items;
      cursor = r.nextCursor;
    }
  }

  async function* sse(res: Response): AsyncGenerator<{ event: string; data: string }> {
    let buf = "";
    // 바이트를 글자로 바꿔 주는 스트림. 한글이 청크 경계에서 잘려도 안전하다
    for await (const text of res.body!.pipeThrough(new TextDecoderStream())) {
      buf += text;
      let end: number;
      while ((end = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, end);
        buf = buf.slice(end + 2);
        const ev = { event: "message", data: "" };
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) ev.event = line.slice(6).trim();
          else if (line.startsWith("data:")) ev.data += line.slice(5).trim();
        }
        if (ev.data) yield ev;
      }
    }
  }

  function rpcClient(url: string) {
    const ws = new WebSocket(url);
    let seq = 0;
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(String(e.data)) as { type: string; id?: number; ok?: boolean; result?: unknown; error?: { message: string } };
      if (m.type !== "rpc" || m.id === undefined) return;
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.ok) p?.resolve(m.result);
      else p?.reject(new Error(m.error?.message));
    });
    const opened = new Promise<void>((r, j) => {
      ws.addEventListener("open", () => r(), { once: true });
      ws.addEventListener("error", () => j(new Error("ws error")), { once: true });
    });
    return {
      opened,
      call: <T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 2000) =>
        new Promise<T>((resolve, reject) => {
          const id = ++seq;
          const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`${method} timed out`));
          }, timeoutMs);
          pending.set(id, {
            resolve: (v) => {
              clearTimeout(timer);
              resolve(v as T);
            },
            reject: (e) => {
              clearTimeout(timer);
              reject(e);
            },
          });
          ws.send(JSON.stringify({ id, method, params }));
        }),
      close: () => ws.close(1000, "done"),
    };
  }

  const demos: Record<string, () => Promise<{ ok: boolean; detail: unknown }>> = {
    async parallel() {
      let t = performance.now();
      for (let i = 0; i < 4; i++) await fetch(`${base(3042)}/slow?ms=80`);
      const sequential = Math.round(performance.now() - t);
      t = performance.now();
      await Promise.all(Array.from({ length: 4 }, () => fetch(`${base(3042)}/slow?ms=80`)));
      const parallel = Math.round(performance.now() - t);
      return { ok: parallel < sequential / 2, detail: { sequential, parallel } };
    },
    async allSettled() {
      const r = await Promise.allSettled([
        fetch(`${base(3042)}/slow?ms=1`),
        fetch(`${base(3042)}/slow?ms=2000`, { signal: AbortSignal.timeout(50) }),
        fetch("http://127.0.0.1:1/", { signal: AbortSignal.timeout(1000) }), // nobody listens on port 1
      ]);
      const outcome = r.map((s) => (s.status === "fulfilled" ? "fulfilled" : (s.reason as Error).name));
      return { ok: outcome[0] === "fulfilled" && outcome[1] === "TimeoutError" && outcome[2] !== "fulfilled", detail: outcome };
    },
    async timeout() {
      const name = await fetch(`${base(3042)}/slow?ms=2000`, { signal: AbortSignal.timeout(100) }).then(
        () => "no error",
        (e: Error) => e.name,
      );
      return { ok: name === "TimeoutError", detail: name };
    },
    async abort() {
      const before = ((await (await fetch(`${base(3042)}/stats`)).json()) as { aborted: number }).aborted;
      const ac = new AbortController();
      const p = fetch(`${base(3042)}/slow?ms=2000`, { signal: ac.signal }).catch((e: Error) => e.name);
      setTimeout(() => ac.abort(), 80);
      const name = await p;
      await Bun.sleep(80);
      const after = ((await (await fetch(`${base(3042)}/stats`)).json()) as { aborted: number }).aborted;
      return { ok: name === "AbortError" && after > before, detail: { clientSaw: name, serverAbortedCount: after } };
    },
    async retry() {
      const key = `k-${Bun.randomUUIDv7()}`;
      const { res, attempts } = await withRetry(() => fetch(`${base(3042)}/flaky?key=${key}&fail=2`));
      return { ok: res.status === 200 && attempts === 3, detail: { status: res.status, attempts } };
    },
    async paging() {
      const ids: number[] = [];
      for await (const n of pages(2)) ids.push(n.id);
      return { ok: ids.length >= 5 && ids.every((id, i) => i === 0 || id > ids[i - 1]!), detail: { count: ids.length } };
    },
    async ndjson() {
      const res = await fetch(`${base(3041)}/export.ndjson`);
      let rest = "";
      let rows = 0;
      let chunks = 0;
      for await (const text of res.body!.pipeThrough(new TextDecoderStream())) {
        chunks++;
        const parsed = JSONL.parseChunk(rest + text); // { values, read }
        rows += parsed.values.length;
        rest = (rest + text).slice(parsed.read); // keep the unfinished last line
      }
      return { ok: rows === 2000 && rest.trim() === "", detail: { rows, chunks } };
    },
    async sse() {
      const ac = new AbortController();
      const res = await fetch(`${base(3072)}/events`, { signal: ac.signal });
      let jobId = "";
      const seen: string[] = [];
      for await (const ev of sse(res)) {
        if (ev.event === "hello") {
          const r = await fetch(`${base(3072)}/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rounds: 2000 }) });
          jobId = ((await r.json()) as { id: string }).id;
          continue;
        }
        const job = JSON.parse(ev.data) as { id: string; status: string };
        if (job.id !== jobId) continue;
        seen.push(job.status);
        if (job.status === "done" || job.status === "failed") break;
      }
      ac.abort();
      return { ok: seen.at(-1) === "done", detail: seen };
    },
    async wsRpc() {
      const c = rpcClient(`ws://127.0.0.1:3073/ws`);
      await c.opened;
      const [sum, pong] = await Promise.all([c.call<number>("add", { a: 2, b: 40 }), c.call<{ pong: number }>("ping")]);
      const bad = await c.call<unknown>("nope").then(() => "no error", (e: Error) => e.message);
      c.close();
      return { ok: sum === 42 && typeof pong.pong === "number" && bad.includes("unknown method"), detail: { sum, bad } };
    },
  };

  const server = Bun.serve({
    port: 3078,
    routes: {
      "/run": async (req, srv) => {
        srv.timeout(req, 30); // the demos take a few seconds in total
        const report: Array<{ name: string; ok: boolean; ms: number; detail: unknown }> = [];
        for (const [name, demo] of Object.entries(demos)) {
          const t = performance.now();
          try {
            report.push({ name, ...(await demo()), ms: Math.round(performance.now() - t) });
          } catch (err) {
            report.push({ name, ok: false, ms: Math.round(performance.now() - t), detail: (err as Error).message });
          }
        }
        return Response.json({ ok: report.every((r) => r.ok), report });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
  });

  console.log(`78 client_patterns → ${server.url}run`);
  register("78", server);
}


// ========== [79] 79_spawn_ipc.ts ==========
async function start79() {
  // Level: Advanced. Bun.spawn with IPC: a supervised child PROCESS that
  // exchanges messages with this one.
  //
  // Worker ([76]) vs child process (here)
  //   Worker: a thread in the same process. Starts fast, can share memory
  //           (SharedArrayBuffer), but a native crash or out-of-memory in
  //           it takes the whole server down.
  //   Child:  a separate process. Slower to start and no shared memory, but
  //           fully isolated: it can crash, leak or be killed and the server
  //           survives. It may also be a different program (Node, Python).
  // How IPC works
  //   Bun.spawn({ cmd, ipc(message) {...} }) opens a message channel to the
  //   child. The parent sends with proc.send(value); the child receives
  //   with process.on("message") and answers with process.send(value).
  //   Values are copied with structuredClone ("advanced" serialization,
  //   the default; use serialization: "json" when the child is Node).
  //   Messages have no ids, so this example adds them to match each answer
  //   to its request, plus a timeout per request.
  // Supervision: onExit fires when the child dies; pending requests are
  // failed (502) and a new child is started. POST /crash kills the child on
  // purpose to show it.
  // The child program is passed with `bun -e "<code>"`, so no extra file.
  // Try:
  //   curl 'localhost:3079/hash?text=hello'
  //   curl localhost:3079/child
  //   curl -X POST localhost:3079/crash

  const CHILD = `
    process.on("message", (msg) => {
      if (msg.type === "hash") {
        const hash = new Bun.CryptoHasher("sha256").update(msg.text).digest("hex");
        process.send({ id: msg.id, ok: true, pid: process.pid, hash });
      } else if (msg.type === "sleep") {
        setTimeout(() => process.send({ id: msg.id, ok: true }), msg.ms);
      } else if (msg.type === "crash") {
        process.exit(1);
      } else {
        process.send({ id: msg.id, ok: false, error: "unknown type" });
      }
    });
    process.send({ type: "ready", pid: process.pid });
  `;
  type Reply = { id: number; ok: boolean; pid?: number; hash?: string; error?: string };
  type Pending = { resolve: (r: Reply) => void; reject: (e: Error) => void; timer: Timer };

  let child: Bun.Subprocess | null = null;
  let ready: Promise<number> = Promise.resolve(0);
  let restarts = 0;
  let stopping = false;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  function spawnChild() {
    let markReady!: (pid: number) => void;
    // resolve를 밖으로 빼 두고, 자식이 ready를 보내면 그때 푼다
    ready = new Promise((resolve) => (markReady = resolve));
    child = Bun.spawn([process.execPath, "-e", CHILD], {
      env: BUN_CHILD_ENV,
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
      ipc(message) {
        const m = message as { type?: string; pid?: number } & Reply;
        if (m.type === "ready") return markReady(m.pid!);
        const p = pending.get(m.id);
        if (!p) return;
        pending.delete(m.id);
        clearTimeout(p.timer);
        p.resolve(m);
      },
      onExit(_proc, exitCode) {
        for (const p of pending.values()) {
          clearTimeout(p.timer);
          p.reject(new HttpError(502, `child exited with code ${exitCode}`));
        }
        pending.clear();
        if (!stopping) {
          restarts++;
          spawnChild();
        }
      },
    });
  }

  async function call(msg: Record<string, unknown>, timeoutMs = 2000): Promise<Reply> {
    await ready;
    const id = ++nextId;
    return new Promise<Reply>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new HttpError(504, "child did not answer in time"));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      child!.send({ ...msg, id });
    });
  }

  spawnChild();
  await ready;

  const server = Bun.serve({
    port: 3079,
    routes: {
      "/hash": async (req) => {
        const text = (qp(req, "text") ?? "").slice(0, 10_000);
        const r = await call({ type: "hash", text });
        return Response.json({ text, hash: r.hash, childPid: r.pid, serverPid: process.pid });
      },
      "/slow": async (req) => {
        const ms = Math.min(Number(qp(req, "ms") ?? 100) || 100, 5000);
        await call({ type: "sleep", ms }, 1000); // > 1000 ms -> 504
        return Response.json({ slept: ms });
      },
      "/child": async () => Response.json({ pid: await ready, restarts, pending: pending.size }),
      "/crash": {
        POST: async () => {
          const oldPid = await ready;
          const before = restarts;
          child!.send({ type: "crash", id: 0 });
          const deadline = Date.now() + 5000;
          while (restarts === before && Date.now() < deadline) await Bun.sleep(10);
          const newPid = await ready;
          return Response.json({ oldPid, newPid, restarted: newPid !== oldPid, restarts });
        },
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`79 spawn_ipc → ${server.url}  (child pid ${await ready})`);
  register("79", {
    url: server.url,
    stop: async (force?: boolean) => {
      stopping = true;
      await server.stop(force);
      // 자식을 끝내고 정말 종료될 때까지 기다린다
      child?.kill();
      await child?.exited;
    },
  });
}


// ========== [80] 80_frontend.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "Frontend".
async function start80() {
  // Level: Advanced. A full-stack app: HTML imports for development and
  // Bun.build() for production, in one server.
  //
  // The official sample imports index.html and dashboard.html and serves
  // them with routes plus development: { hmr: true, console: true }.
  // [65] shows a single page; this adds:
  //   - two pages that share a stylesheet (the bundler emits the shared CSS
  //     once and both pages link it);
  //   - TSX WITHOUT React: the /** @jsx h */ pragma tells the transpiler to
  //     call our own tiny h() instead of React.createElement;
  //   - console: true streams the browser's console.log into this terminal;
  //   - GET /build runs Bun.build() in memory (no outdir: outputs are Blobs)
  //     and /dist/* serves the result: the production path, where HTML is
  //     bundled ONCE, minified, with hashed file names you can cache forever.
  // Dev vs prod
  //   dev  (routes: { "/": homepage })  Bun bundles on the first request and
  //        rebuilds on change; HMR swaps modules in the open browser tab.
  //   prod `bun build ./index.html --production --outdir dist` (CLI) or
  //        Bun.build({ entrypoints, minify: true }) (API), then serve the
  //        files as static assets with Cache-Control: immutable.
  // The source files are written to _frontend/ only if missing, so you can
  // edit them while `bun --hot allblue.ts` runs and watch HMR update the page.
  // Try:
  //   open http://localhost:3080/ and http://localhost:3080/dashboard
  //   curl localhost:3080/build
  //   open http://localhost:3080/dist/index.html

  const FE = `${BASE_DIR}/_frontend`;
  await writeIfMissing(
    `${FE}/index.html`,
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Frontend ★</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <main id="app"></main>
  <p><a href="/dashboard">dashboard</a></p>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
`,
  );
  await writeIfMissing(
    `${FE}/dashboard.html`,
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Dashboard ★</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <h1>Dashboard</h1>
  <pre id="stats">loading...</pre>
  <p><a href="/">home</a></p>
  <script type="module" src="./dashboard.ts"></script>
</body>
</html>
`,
  );
  await writeIfMissing(
    `${FE}/style.css`,
    `body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
button { padding: 0.4rem 0.9rem; }
`,
  );
  await writeIfMissing(
    `${FE}/main.tsx`,
    `/** @jsxRuntime classic */
/** @jsx h */
// A 10-line JSX factory instead of React: JSX is only syntax, the
// transpiler turns <p>hi</p> into h("p", null, "hi").
function h(tag: string, props: Record<string, any> | null, ...children: any[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, String(v));
  }
  el.append(...children.flat());
  return el;
}

let count = 0;
const label = <strong>0</strong>;
const app = (
  <section>
    <h1>Bun frontend</h1>
    <p>clicks: {label}</p>
    <button onClick={() => (label.textContent = String(++count))}>+1</button>
  </section>
);
document.getElementById("app")!.append(app);

const res = await fetch("/api/health");
console.log("health from the browser:", await res.json()); // shown in the terminal (console: true)
`,
  );
  await writeIfMissing(
    `${FE}/dashboard.ts`,
    `const res = await fetch("/api/stats");
document.getElementById("stats")!.textContent = JSON.stringify(await res.json(), null, 2);
`,
  );

  // Dynamic import of an HTML file returns the same HTMLBundle a static
  // `import homepage from "./index.html"` would (see [65]).
  const homepage = (await import(`${FE}/index.html`)).default;
  const dashboard = (await import(`${FE}/dashboard.html`)).default;

  let dist: Map<string, Blob> | null = null;
  async function buildForProduction() {
    const result = await Bun.build({
      entrypoints: [`${FE}/index.html`, `${FE}/dashboard.html`],
      minify: true,
    });
    if (!result.success) throw new HttpError(500, "build failed", result.logs.map(String));
    // Output paths look like "./index.html", "./chunk-<hash>.js".
    // 메모리에만 있는 빌드 결과를 파일 이름으로 찾게 Map에 담는다
    dist = new Map(result.outputs.map((o) => [o.path.replace(/^\.\//, ""), o]));
    return result.outputs.map((o) => ({ path: o.path, kind: o.kind, type: o.type, bytes: o.size }));
  }

  const startedAt = Date.now();
  const server = Bun.serve({
    port: 3080,
    routes: {
      "/": homepage,
      "/dashboard": dashboard,
      "/api/health": () => Response.json({ ok: true }),
      "/api/stats": () => Response.json({ uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), bun: Bun.version }),
      "/build": async () => Response.json({ outputs: await buildForProduction() }),
      "/dist/*": async (req) => {
        if (!dist) await buildForProduction();
        const name = new URL(req.url).pathname.slice("/dist/".length) || "index.html";
        const file = dist!.get(name);
        if (!file) throw new HttpError(404, `not in the build: ${name}`);
        const immutable = /-[a-z0-9]{8}\.(js|css)$/.test(name); // hashed names never change content
        return new Response(file, {
          headers: { "Content-Type": file.type, "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache" },
        });
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
    development: { hmr: true, console: true },
  });

  console.log(`80 frontend ★ → ${server.url}  (edit _frontend/main.tsx under bun --hot)`);
  register("80", server);
}


// ========== [81] 81_bun_ffi.ts ==========
// ★ IMPORTANT — official bun.com showcase sample "FFI".
async function start81() {
  // Level: Advanced. bun:ffi: call C functions in shared libraries (and
  // libraries written in Rust or Zig with a C ABI) without writing a
  // native addon.
  //
  // The official sample: dlopen(`libsqlite3.${suffix}`, { sqlite3_libversion:
  // { args: [], returns: FFIType.cstring } }) and prints the version.
  // `suffix` is "dylib" on macOS, "so" on Linux, "dll" on Windows.
  //
  // How it works
  //   dlopen(path, symbols) loads the library and, for each symbol, compiles
  //   a small trampoline that converts JS values to C values and back. The
  //   signature you declare is TRUSTED: there is no header file to check it
  //   against. A wrong type does not throw, it crashes or corrupts memory.
  //   Types: i32/u32/f64 -> number, i64/u64 -> bigint (that is why strlen
  //   returns 5n), cstring -> JS string (copied), ptr -> a number address.
  //   ptr(typedArray) gives the address of a buffer's memory. Keep the
  //   buffer referenced while C uses it: if it is garbage-collected, C reads
  //   freed memory. Strings for C must end with "\0".
  //   cc({ source, symbols }) compiles C source AT RUNTIME with the bundled
  //   TinyCC and links it immediately: handy for small hot loops. A typed
  //   array can be passed directly where the C code expects a pointer.
  //   lib.close() unloads the library; calling its symbols afterwards crashes.
  // When to use it: to reach an existing C library (sqlite, libgit2, a GPU
  // or hardware SDK). It is not faster than JS for small calls: each call
  // crosses the JS/C boundary.
  // Try:
  //   curl localhost:3081/ffi

  const C_SOURCE = `${tmpdir()}/bun-all-ts-ffi.c`;
  await Bun.write(
    C_SOURCE,
    `int sum_i32(int *xs, int n) { int s = 0; for (int i = 0; i < n; i++) s += xs[i]; return s; }
const char *greeting(void) { return "hello from C, compiled by TinyCC at runtime"; }
`,
  );

  const server = Bun.serve({
    port: 3081,
    routes: {
      "/ffi": () => {
        const report: Record<string, unknown> = { platform: process.platform, suffix };
        const attempt = (name: string, fn: () => unknown) => {
          try {
            report[name] = fn();
          } catch (err) {
            report[name] = { error: (err as Error).message };
          }
        };
        attempt("sqliteVersion", () => {
          // Linux distributions usually ship only the versioned file name.
          const names = process.platform === "linux" ? ["libsqlite3.so.0", `libsqlite3.${suffix}`]
            : process.platform === "win32" ? ["sqlite3.dll", "winsqlite3.dll"] : [`libsqlite3.${suffix}`];
          let lastError: unknown;
          for (const name of names) {
            try {
              const lib = dlopen(name, { sqlite3_libversion: { args: [], returns: FFIType.cstring } });
              const version = String(lib.symbols.sqlite3_libversion());
              lib.close();
              return version;
            } catch (err) {
              lastError = err;
            }
          }
          throw lastError;
        });
        attempt("libc", () => {
          // The C library has a different file name on each OS. Windows ships
          // msvcrt.dll, where getpid is spelled _getpid.
          const win = process.platform === "win32";
          const libcName = win ? "msvcrt.dll" : process.platform === "darwin" ? "libc.dylib" : "libc.so.6";
          const raw = dlopen(libcName, {
            // OS마다 함수 이름이 달라서 키를 계산해서 넣는다
            [win ? "_getpid" : "getpid"]: { args: [], returns: FFIType.i32 },
            strlen: { args: [FFIType.ptr], returns: FFIType.u64 },
            abs: { args: [FFIType.i32], returns: FFIType.i32 },
          } as const);
          const sym = raw.symbols as unknown as Record<string, (...a: unknown[]) => number | bigint>;
          const libc = { symbols: { getpid: sym[win ? "_getpid" : "getpid"]!, strlen: sym.strlen!, abs: sym.abs! }, close: () => raw.close() };
          const text = Buffer.from("hello\0"); // NUL-terminated for C
          const out = {
            getpid: libc.symbols.getpid(),
            sameAsProcessPid: libc.symbols.getpid() === process.pid,
            strlen: Number(libc.symbols.strlen(ptr(text))), // u64 arrives as bigint
            abs: libc.symbols.abs(-42),
          };
          libc.close();
          return out;
        });
        attempt("tinycc", () => {
          const { symbols, close } = cc({
            source: C_SOURCE,
            symbols: {
              sum_i32: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.i32 },
              greeting: { args: [], returns: FFIType.cstring },
            },
          });
          const numbers = new Int32Array([1, 2, 3, 4]);
          const out = { sum: symbols.sum_i32(numbers, numbers.length), greeting: String(symbols.greeting()) };
          close();
          return out;
        });
        return Response.json(report);
      },
    },
    fetch: () => Response.json({ error: "Not Found" }, { status: 404 }),
    error: errorResponse,
  });

  console.log(`81 bun_ffi ★ → ${server.url}ffi`);
  register("81", server);
}


// ############################################################################
// ############################################################################
//
//   RUNNER: choosing, starting and stopping examples
//
// ############################################################################
// ############################################################################

//   bun allblue.ts                    every example, [01]-[81]
//   bun allblue.ts 01 05 12           only these
//   bun allblue.ts 20-25              a range
//   bun allblue.ts beginner           a level: beginner | intermediate | advanced
//   bun allblue.ts official           the ★ official bun.com showcase examples
//   bun allblue.ts beginner 40 50-52  arguments can be mixed
//   bun --hot allblue.ts 76           flags for bun go BEFORE the file name
// Bun.argv is [bun binary, this file, ...arguments], so the arguments start
// at index 2. Examples always start in number order, whatever order you type.
// Some examples call other examples over HTTP; those are started too and
// the console says so (NEEDS below). Unknown arguments print the usage and
// exit with code 2.

const START: Record<string, () => Promise<void>> = {
  "01": start01, "02": start02, "03": start03, "04": start04, "05": start05, "06": start06, "07": start07, "08": start08,
  "09": start09, "10": start10, "11": start11, "12": start12, "13": start13, "14": start14, "15": start15, "16": start16,
  "17": start17, "18": start18, "19": start19, "20": start20, "21": start21, "22": start22, "23": start23, "24": start24,
  "25": start25, "26": start26, "27": start27, "28": start28, "29": start29, "30": start30, "31": start31, "32": start32,
  "33": start33, "34": start34, "35": start35, "36": start36, "37": start37, "38": start38, "39": start39, "40": start40,
  "41": start41, "42": start42, "43": start43, "44": start44, "45": start45, "46": start46, "47": start47, "48": start48,
  "49": start49, "50": start50, "51": start51, "52": start52, "53": start53, "54": start54, "55": start55, "56": start56,
  "57": start57, "58": start58, "59": start59, "60": start60, "61": start61, "62": start62, "63": start63, "64": start64,
  "65": start65, "66": start66, "67": start67, "68": start68, "69": start69, "70": start70, "71": start71, "72": start72,
  "73": start73, "74": start74, "75": start75, "76": start76, "77": start77, "78": start78, "79": start79, "80": start80,
  "81": start81,
};

const GROUPS: Record<string, string[]> = {
  beginner: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
  intermediate: ["21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56"],
  advanced: ["57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81"],
  official: ["17", "18", "47", "49", "50", "51", "52", "53", "80", "81"],
};

/** Examples that call other examples, and which ones they call. */
const NEEDS: Record<string, string[]> = {
  "78": ["39", "41", "42", "72", "73"], // client patterns call these servers
  "54": ["03", "58", "62", "16"], // unix socket, proxy target, TLS and gzip targets
};

function selectExamples(args: string[]): string[] {
  const all = Object.keys(START);
  if (args.length === 0 || args.includes("all")) return all;
  const chosen = new Set<string>();
  const pad = (n: number) => String(n).padStart(2, "0");
  for (const arg of args) {
    const group = GROUPS[arg.toLowerCase()];
    const range = /^(\d{1,2})-(\d{1,2})$/.exec(arg);
    if (group) group.forEach((id) => chosen.add(id));
    else if (range) for (let n = Number(range[1]); n <= Number(range[2]); n++) chosen.add(pad(n));
    else if (/^\d{1,2}$/.test(arg)) chosen.add(pad(Number(arg)));
    else chosen.add(`?${arg}`);
  }
  const unknown = [...chosen].filter((id) => !START[id]);
  if (unknown.length > 0) {
    console.error(`unknown example(s): ${unknown.map((u) => u.replace(/^\?/, "")).join(", ")}`);
    console.error("usage: bun allblue.ts [01-81 | 20-25 | beginner | intermediate | advanced | official | all] ...");
    process.exit(2);
  }
  for (const id of [...chosen]) {
    const extra = (NEEDS[id] ?? []).filter((dep) => !chosen.has(dep));
    if (extra.length > 0) {
      console.log(`also starting [${extra.join("] [")}] (needed by [${id}])`);
      extra.forEach((dep) => chosen.add(dep));
    }
  }
  return all.filter((id) => chosen.has(id)); // number order
}

// Starts the chosen examples one after another, on fixed ports.
// If one port is already taken, Bun.serve throws EADDRINUSE and the whole
// process stops: check with `lsof -nP -iTCP:3001-3081 -sTCP:LISTEN`.
async function startExamples(ids: string[]) {
  for (const id of ids) await START[id]!();
  // The self-test waits for this exact line before it starts testing.
  console.log(`examples ready: ${servers.length} servers`);
}

let closing = false;
// One shutdown for everything: Ctrl+C (SIGINT) or kill (SIGTERM) stops
// servers in reverse start order, each waiting for its in-flight requests,
// removes the unix socket file, then exits with code 0.
async function shutdownAll(sig: string) {
  if (closing) return;
  closing = true;
  console.log(`\n${sig}: graceful stop (${servers.length})`);
  for (const s of [...servers].reverse()) {
    try {
      await s.server.stop();
    } catch (e) {
      console.error("stop failed", s.id, e);
    }
  }
  try {
    if (existsSync(UNIX_SOCK)) unlinkSync(UNIX_SOCK);
  } catch {}
  process.exit(0);
}

// ############################################################################
// ############################################################################
//
//   SELF-TEST: bun test ./allblue.ts
//
// ############################################################################
// ############################################################################

/**
 * `bun test ./allblue.ts` runs the tests below; `bun allblue.ts` never does.
 * (The "./" matters: without it bun test treats "allblue.ts" as a name filter
 * and only looks at files named *.test.ts.)
 *
 * How it works
 *   bun test sets NODE_ENV=test, so this file defines tests instead of
 *   starting servers. beforeAll() then starts THIS file again as a normal
 *   child process (`bun allblue.ts`, NODE_ENV removed) and waits for the line
 *   "examples ready". Each describe() block talks to one example over HTTP,
 *   WebSocket, TCP, UDP or the unix socket. The last block sends SIGINT and
 *   checks the graceful shutdown (exit code 0, socket file removed).
 *
 * bun:test basics used here
 *   describe/test      group and name checks; tests run in file order
 *   expect(x).toBe()   strict equality; toEqual() deep equality;
 *                      toContain(), toMatch(), toBeGreaterThan(), ...
 *   test(name, fn, ms) the third argument is a per-test timeout (default 5 s)
 *   beforeAll/afterAll run once around the whole file
 *
 * Side effects are cleaned up: uploaded files and rows in file databases are
 * deleted again; databases of the newer examples are in memory; the toolchain
 * demos write only to the OS temp folder; the OS keychain is never touched.
 */
async function defineSelfTests() {
  const { afterAll, beforeAll, describe, expect, test } = await import("bun:test");
  // The child must start servers, so it must not see NODE_ENV=test.
  const CHILD_ENV: Record<string, string | undefined> = { ...process.env, NODE_ENV: undefined };


  const DIR = BASE_DIR;
  const url = (port: number, path = "/") => `http://127.0.0.1:${port}${path}`;
  const json = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  let proc: Bun.Subprocess<"ignore", "pipe", "pipe"> | undefined;
  let stdout = "";
  let stderr = "";

  // ----------------------------------------------------------------------------
  // Start allblue.ts once for the whole file
  // ----------------------------------------------------------------------------
  beforeAll(async () => {
    // Fail with a clear message if something is already listening on 3001.
    const busy = await fetch(url(3001), { signal: AbortSignal.timeout(300) }).then(
      () => true,
      () => false,
    );
    if (busy) throw new Error("port 3001 is already in use: stop the running allblue.ts before testing");

    proc = Bun.spawn([process.execPath, import.meta.path], { cwd: DIR, env: CHILD_ENV, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    void (async () => {
      for await (const t of proc!.stderr.pipeThrough(new TextDecoderStream())) stderr += t;
    })();
    const reader = proc.stdout.pipeThrough(new TextDecoderStream()).getReader();
    const deadline = Date.now() + 20_000;
    while (!stdout.includes("examples ready")) {
      if (Date.now() > deadline) throw new Error(`allblue.ts did not become ready.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
      const { value, done } = await reader.read();
      if (done) throw new Error(`allblue.ts exited early.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
      stdout += value;
    }
    // keep draining so the child never blocks on a full pipe
    void (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          stdout += value;
        }
      } catch {}
    })();
  }, 30_000);

  afterAll(() => {
    if (proc && proc.exitCode === null) proc.kill("SIGKILL"); // only if the shutdown test did not run
  });

  // ----------------------------------------------------------------------------
  // Small helpers
  // ----------------------------------------------------------------------------

  /** "name=value" pairs from Set-Cookie headers, ready for a Cookie header. */
  function cookieHeader(res: Response, jar: Record<string, string> = {}): Record<string, string> {
    for (const sc of res.headers.getSetCookie()) {
      const [pair] = sc.split(";");
      const eq = pair!.indexOf("=");
      const name = pair!.slice(0, eq).trim();
      const value = pair!.slice(eq + 1).trim();
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(sc) || value === "") delete jar[name];
      else jar[name] = value;
    }
    return jar;
  }
  const cookieString = (jar: Record<string, string>) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

  /** Open a WebSocket and collect its text messages. */
  async function wsOpen(address: string, headers?: Record<string, string>) {
    // Bun's WebSocket client accepts { headers } (not possible in browsers).
    const ws = headers ? new WebSocket(address, { headers } as unknown as string[]) : new WebSocket(address);
    ws.binaryType = "arraybuffer";
    const messages: string[] = [];
    const waiters: Array<{ pred: (m: string) => boolean; resolve: (m: string) => void }> = [];
    ws.addEventListener("message", (e) => {
      const m = typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data as ArrayBuffer);
      messages.push(m);
      for (const w of [...waiters]) if (w.pred(m)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(m);
      }
    });
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener("error", () => reject(new Error(`cannot connect to ${address}`)), { once: true });
    });
    const waitFor = (pred: (m: string) => boolean, ms = 2000) => {
      const seen = messages.find(pred);
      if (seen) return Promise.resolve(seen);
      return new Promise<string>((resolve, reject) => {
        const w = { pred, resolve };
        waiters.push(w);
        setTimeout(() => {
          if (waiters.includes(w)) {
            waiters.splice(waiters.indexOf(w), 1);
            reject(new Error(`timeout waiting on ${address}; got: ${JSON.stringify(messages)}`));
          }
        }, ms);
      });
    };
    const close = async () => {
      if (ws.readyState === WebSocket.CLOSED) return;
      const closed = new Promise((r) => ws.addEventListener("close", r, { once: true }));
      ws.close(1000);
      await closed;
    };
    return { ws, messages, waitFor, close };
  }

  /** Minimal valid PNG (RGB gradient), built from bytes. */
  function makePng(w: number, h: number): Uint8Array {
    const chunk = (type: string, data: Uint8Array) => {
      const out = new Uint8Array(12 + data.length);
      const v = new DataView(out.buffer);
      v.setUint32(0, data.length);
      out.set(new TextEncoder().encode(type), 4);
      out.set(data, 8);
      v.setUint32(8 + data.length, Bun.hash.crc32(out.subarray(4, 8 + data.length)));
      return out;
    };
    const raw = new Uint8Array(h * (1 + w * 3));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([x * 3, y * 3, 128], y * (1 + w * 3) + 1 + x * 3);
    const def = Bun.deflateSync(raw);
    const z = new Uint8Array(def.length + 6);
    z.set([0x78, 0xda]);
    z.set(def, 2);
    new DataView(z.buffer).setUint32(2 + def.length, Bun.hash.adler32(raw));
    const ihdr = new Uint8Array(13);
    new DataView(ihdr.buffer).setUint32(0, w);
    new DataView(ihdr.buffer).setUint32(4, h);
    ihdr.set([8, 2, 0, 0, 0], 8);
    return new Uint8Array(
      Bun.concatArrayBuffers([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", z), chunk("IEND", new Uint8Array())]),
    );
  }

  /** A JPEG with an EXIF APP1 segment carrying a fake GPS text and Orientation = 6. */
  async function jpegWithExif(): Promise<Uint8Array> {
    const jpg = await new Bun.Image(makePng(40, 20)).jpeg({ quality: 90 }).bytes();
    const text = new TextEncoder().encode("GPS 37.5665N 126.9780E\0");
    const ifd = 2 + 2 * 12 + 4;
    const tiff = new Uint8Array(8 + ifd + text.length);
    const v = new DataView(tiff.buffer);
    tiff.set([0x4d, 0x4d, 0, 42]);
    v.setUint32(4, 8);
    v.setUint16(8, 2);
    v.setUint16(10, 0x010e); v.setUint16(12, 2); v.setUint32(14, text.length); v.setUint32(18, 8 + ifd);
    v.setUint16(22, 0x0112); v.setUint16(24, 3); v.setUint32(26, 1); v.setUint16(30, 6);
    tiff.set(text, 8 + ifd);
    const payload = new Uint8Array([...new TextEncoder().encode("Exif\0\0"), ...tiff]);
    const seg = new Uint8Array(4 + payload.length);
    seg.set([0xff, 0xe1]);
    new DataView(seg.buffer).setUint16(2, payload.length + 2);
    seg.set(payload, 4);
    return new Uint8Array(Bun.concatArrayBuffers([jpg.subarray(0, 2), seg, jpg.subarray(2)]));
  }
  const includes = (b: Uint8Array, s: string) => Buffer.from(b).includes(s);

  describe("[01] hello", () => {
    test("any path answers the same text", async () => {
      expect(await (await fetch(url(3001))).text()).toBe("Hello, Bun.serve!");
      expect(await (await fetch(url(3001, "/anything"), { method: "DELETE" })).text()).toBe("Hello, Bun.serve!");
    });
  });

  describe("[02] html", () => {
    test("text/html with the page", async () => {
      const res = await fetch(url(3002));
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain("<h1>Hello HTML</h1>");
    });
  });

  describe("[03] json", () => {
    test("routes + JSON 404 fallback", async () => {
      const s = (await (await fetch(url(3003, "/api/status"))).json()) as { ok: boolean; runtime: string };
      expect(s.ok).toBe(true);
      expect(s.runtime).toBe("bun");
      const nf = await fetch(url(3003, "/nope"));
      expect(nf.status).toBe(404);
      expect(await nf.json()).toEqual({ error: "Not Found" });
    });
  });

  describe("[04] routes", () => {
    test("path params are strings", async () => {
      expect(await (await fetch(url(3004, "/users/42"))).json()).toEqual({ userId: "42" });
      expect(await (await fetch(url(3004, "/orgs/acme/repos/api"))).json()).toEqual({ orgId: "acme", repoId: "api" });
    });
  });

  describe("[05] methods", () => {
    test("GET, POST 201, title 400, invalid JSON 400", async () => {
      expect(((await (await fetch(url(3005, "/api/posts"))).json()) as { posts: unknown[] }).posts.length).toBeGreaterThanOrEqual(2);
      const created = await fetch(url(3005, "/api/posts"), json({ title: "from test" }));
      expect(created.status).toBe(201);
      expect((await fetch(url(3005, "/api/posts"), json({ title: "  " }))).status).toBe(400);
      expect((await fetch(url(3005, "/api/posts"), { method: "POST", body: "{bad" })).status).toBe(400); // FIXED: was 500
    });
    test("FIXED: an unlisted method gets 405 + Allow", async () => {
      const res = await fetch(url(3005, "/api/posts"), { method: "PUT" });
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("GET, HEAD, POST");
      expect((await fetch(url(3005, "/elsewhere"))).status).toBe(404);
    });
  });

  describe("[06] query", () => {
    test("valid and invalid query strings", async () => {
      expect(await (await fetch(url(3006, "/search?q=bun&page=2"))).json()).toEqual({ term: "bun", page: 2, results: ["bun 결과 #2"] });
      expect((await fetch(url(3006, "/search"))).status).toBe(400);
      expect((await fetch(url(3006, "/search?q=x&page=0"))).status).toBe(400);
    });
  });

  describe("[07] body", () => {
    test("text, json, form", async () => {
      expect(await (await fetch(url(3007, "/echo/text"), { method: "POST", body: "hello" })).json()).toEqual({ type: "text", length: 5, text: "hello" });
      expect(await (await fetch(url(3007, "/echo/json"), json({ name: "bun" }))).json()).toEqual({ type: "json", data: { name: "bun" } });
      expect((await fetch(url(3007, "/echo/json"), { method: "POST", body: "{bad" })).status).toBe(400);
      const form = await fetch(url(3007, "/echo/form"), { method: "POST", body: new URLSearchParams({ name: "bun", age: "1" }) });
      expect(await form.json()).toEqual({ type: "form", entries: { name: "bun", age: "1" } });
    });
  });

  describe("[08] static", () => {
    test("files, HEAD and Range handled by Bun", async () => {
      expect(await (await fetch(url(3008, "/readme.txt"))).text()).toContain("Bun.file");
      expect((await fetch(url(3008, "/page.html"))).headers.get("content-type")).toContain("text/html");
      const head = await fetch(url(3008, "/readme.txt"), { method: "HEAD" });
      expect(head.status).toBe(200);
      expect(Number(head.headers.get("content-length"))).toBeGreaterThan(0);
      const part = await fetch(url(3008, "/readme.txt"), { headers: { Range: "bytes=0-7" } });
      expect(part.status).toBe(206);
      expect(await part.text()).toBe("Bun.file");
    });
  });

  describe("[09] cookies", () => {
    test("visit counter round trip, logout clears it", async () => {
      const r1 = await fetch(url(3009, "/visit"));
      const jar = cookieHeader(r1);
      expect(((await r1.json()) as { visits: number }).visits).toBe(1);
      expect(jar.visits).toBe("1");
      const r2 = await fetch(url(3009, "/visit"), { headers: { Cookie: cookieString(jar) } });
      expect(((await r2.json()) as { visits: number }).visits).toBe(2);
      const out = await fetch(url(3009, "/logout"), { headers: { Cookie: cookieString(cookieHeader(r2, jar)) } });
      expect(out.headers.getSetCookie().join()).toContain("visits=");
    });
    test("FIXED: a non-numeric cookie counts as 0 (was NaN)", async () => {
      const r = (await (await fetch(url(3009, "/visit"), { headers: { Cookie: "visits=abc" } })).json()) as { visits: number };
      expect(r.visits).toBe(1);
    });
  });

  describe("[10] redirect", () => {
    test("static responses and a 302", async () => {
      expect(await (await fetch(url(3010, "/health"))).text()).toBe("OK");
      expect((await fetch(url(3010, "/ready"))).headers.get("x-ready")).toBe("1");
      const r = await fetch(url(3010, "/blog"), { redirect: "manual" });
      expect(r.status).toBe(302);
      expect(r.headers.get("location")).toBe("https://bun.com/blog");
      expect(await (await fetch(url(3010, "/api/config"))).json()).toEqual({ version: "1.0.0", env: "development" });
    });
  });

  describe("[11] error", () => {
    test("error() turns a throw into JSON 500", async () => {
      expect((await fetch(url(3011, "/ok"))).status).toBe(200);
      const boom = await fetch(url(3011, "/boom"));
      expect(boom.status).toBe(500);
      expect(((await boom.json()) as { message: string }).message).toBe("의도적으로 터뜨린 에러");
    });
  });

  describe("[12] data formats", () => {
    const conv = async (from: string, body: string) => fetch(url(3012, `/convert?from=${from}`), { method: "POST", body });
    test("every parser", async () => {
      expect(((await (await conv("yaml", "a: 1\nb: [x, y]")).json()) as { value: unknown }).value).toEqual({ a: 1, b: ["x", "y"] });
      expect(((await (await conv("toml", '[server]\nport = 8080')).json()) as { value: unknown }).value).toEqual({ server: { port: 8080 } });
      expect(((await (await conv("json5", "{a:1,}")).json()) as { value: unknown }).value).toEqual({ a: 1 });
      expect(((await (await conv("jsonc", '{"a":1 // c\n}')).json()) as { value: unknown }).value).toEqual({ a: 1 });
      expect(((await (await conv("jsonl", '{"a":1}\n{"a":2}\n')).json()) as { value: unknown }).value).toEqual([{ a: 1 }, { a: 2 }]);
      expect(((await (await conv("xml", '<r a="1"><t>hi</t></r>')).json()) as { value: unknown }).value).toEqual({ r: { "@a": "1", t: "hi" } });
    });
    test("errors and YAML output", async () => {
      expect((await conv("yaml", "a: [")).status).toBe(400);
      expect((await conv("ini", "x")).status).toBe(400);
      expect(await (await fetch(url(3012, "/to/yaml"), json({ a: [1, 2] }))).text()).toBe("a:\n  - 1\n  - 2\n");
    });
  });

  describe("[13] hashing, ids, passwords", () => {
    test("known SHA-256 and sortable v7 ids", async () => {
      const h = (await (await fetch(url(3013, "/hash?text=hello"))).json()) as { sha256: string; crc32: string };
      expect(h.sha256).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
      expect(h.crc32).toBe("3610a686");
      expect(((await (await fetch(url(3013, "/ids"))).json()) as { v7SortsByCreationTime: boolean }).v7SortsByCreationTime).toBe(true);
    });
    test("argon2id hash + verify", async () => {
      const { hash } = (await (await fetch(url(3013, "/password/hash"), json({ password: "pw" }))).json()) as { hash: string };
      expect(hash.startsWith("$argon2id$")).toBe(true);
      expect(await (await fetch(url(3013, "/password/verify"), json({ password: "pw", hash }))).json()).toEqual({ ok: true });
      expect(await (await fetch(url(3013, "/password/verify"), json({ password: "nope", hash }))).json()).toEqual({ ok: false });
    });
  });

  describe("[14] file API", () => {
    const name = `t-${Date.now().toString(36)}.txt`;
    test("PUT, list, info, GET, DELETE", async () => {
      expect((await fetch(url(3014, `/files/${name}`), { method: "PUT", body: "hi there" })).status).toBe(201);
      expect(((await (await fetch(url(3014, "/files"))).json()) as { name: string }[]).some((f) => f.name === name)).toBe(true);
      const info = (await (await fetch(url(3014, `/files/${name}/info`))).json()) as { size: number; type: string };
      expect(info.size).toBe(8);
      expect(info.type).toContain("text/plain");
      expect(await (await fetch(url(3014, `/files/${name}`))).text()).toBe("hi there");
      expect((await fetch(url(3014, `/files/${name}`), { method: "DELETE" })).status).toBe(204);
      expect((await fetch(url(3014, `/files/${name}`))).status).toBe(404);
    });
    test("names outside the rule are refused", async () => {
      expect((await fetch(url(3014, "/files/..%2Fx.txt"), { method: "PUT", body: "x" })).status).toBe(400);
      expect((await fetch(url(3014, "/files/run.sh"), { method: "PUT", body: "x" })).status).toBe(400);
    });
  });

  describe("[15] markdown + escaping", () => {
    test("default keeps <script>, the safe renderer does not", async () => {
      const md = "# Hi <script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](https://bun.com)";
      const r = (await (await fetch(url(3015, "/render/compare"), { method: "POST", body: md })).json()) as { unsafeDefault: string; safe: string };
      expect(r.unsafeDefault).toContain("<script>");
      expect(r.safe).not.toContain("<script>");
      expect(r.safe).not.toContain("javascript:");
      expect(r.safe).toContain('href="https://bun.com"');
      const page = await fetch(url(3015, "/render"), { method: "POST", body: md });
      expect(page.headers.get("content-security-policy")).toContain("default-src 'none'");
      expect(await (await fetch(url(3015, '/escape?text=<b>"x"</b>'))).json()).toEqual({ escaped: "&lt;b&gt;&quot;x&quot;&lt;/b&gt;" });
    });
  });

  describe("[16] compression", () => {
    test("negotiated encodings are smaller and decode transparently", async () => {
      const sizes = (await (await fetch(url(3016, "/sizes"))).json()) as { identity: number; gzip: number; zstd: number };
      expect(sizes.gzip).toBeLessThan(sizes.identity / 5);
      for (const enc of ["zstd", "gzip"]) {
        const res = await fetch(url(3016, "/data"), { headers: { "Accept-Encoding": enc } });
        expect(res.headers.get("content-encoding")).toBe(enc);
        expect(res.headers.get("vary")).toBe("Accept-Encoding");
        expect(((await res.json()) as { items: unknown[] }).items.length).toBe(500); // fetch decoded it
      }
      const plain = await fetch(url(3016, "/data"), { headers: { "Accept-Encoding": "identity" } });
      expect(plain.headers.get("content-encoding")).toBeNull();
    });
  });

  describe("[17] ★ HTTP server", () => {
    test("static route, params, 400/404, POST 201 + Location, 409", async () => {
      expect(await (await fetch(url(3017))).text()).toBe("Welcome to Bun!");
      expect(await (await fetch(url(3017, "/api/users/1"))).json()).toEqual({ id: 1, name: "Alice", email: "alice@example.com" });
      expect((await fetch(url(3017, "/api/users/abc"))).status).toBe(400);
      expect((await fetch(url(3017, "/api/users/999"))).status).toBe(404);
      const email = `t-${crypto.randomUUID().slice(0, 8)}@example.com`;
      const created = await fetch(url(3017, "/api/users"), json({ name: "Test", email }));
      expect(created.status).toBe(201);
      const user = (await created.json()) as { id: number };
      expect(created.headers.get("location")).toBe(`/api/users/${user.id}`);
      expect((await fetch(url(3017, "/api/users"), json({ name: "Test", email }))).status).toBe(409);
      expect((await fetch(url(3017, "/api/users"), json({ name: "", email: "x" }))).status).toBe(422);
    });
  });

  describe("[18] ★ passwords flow", () => {
    test("signup, login, generic 401, bcrypt upgraded to argon2id once", async () => {
      const user = `u${crypto.randomUUID().slice(0, 8)}`;
      expect((await fetch(url(3018, "/signup"), json({ user, password: "correct horse" }))).status).toBe(201);
      expect((await fetch(url(3018, "/signup"), json({ user, password: "x" }))).status).toBe(409);
      const ok = (await (await fetch(url(3018, "/login"), json({ user, password: "correct horse" }))).json()) as { ok: boolean; upgraded: boolean };
      expect(ok).toMatchObject({ ok: true, upgraded: false });
      const wrong = await fetch(url(3018, "/login"), json({ user, password: "nope" }));
      const unknown = await fetch(url(3018, "/login"), json({ user: "nobody-here", password: "nope" }));
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(await wrong.json()).toEqual(await unknown.json()); // same message: no user enumeration
      const first = (await (await fetch(url(3018, "/login"), json({ user: "legacy", password: "old-password" }))).json()) as { upgraded: boolean; algorithm: string };
      const second = (await (await fetch(url(3018, "/login"), json({ user: "legacy", password: "old-password" }))).json()) as { upgraded: boolean; algorithm: string };
      expect(first.algorithm).toBe("argon2id");
      expect(second).toMatchObject({ upgraded: false, algorithm: "argon2id" });
    });
  });

  describe("[19] standard-library utilities", () => {
    test("/utils values", async () => {
      const u = (await (await fetch(url(3019, "/utils"))).json()) as Record<string, any>;
      expect(u.escapeHTML).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#x27;Jerry&#x27;&lt;/a&gt;");
      expect(u.deepEquals).toEqual({ loose: true, undefinedLoose: true, undefinedStrict: false });
      expect(u.stringWidth).toEqual({ abc: 3, korean: 4, ansi: 3, lengthOfKorean: 2 });
      expect(u.semver).toEqual({ satisfies: true, order: 1 });
      expect(u.peek).toEqual({ settled: 42, pendingIsSame: true });
      expect(u.color.red).toBe("#ff0000");
      expect(u.glob).toEqual({ tsx: true, md: false });
      expect(u.fileURLToPath).toBe("/tmp/a b.txt");
      expect(u.structuredClone).toEqual({ dateKept: true, setKept: true, mapKept: true, isNewObject: true, functionThrows: "DataCloneError" });
      expect(u.runtime.version).toBe(Bun.version);
      expect(u.importMeta).toEqual({ file: "allblue.ts", isMain: true, mainIsThisFile: true });
    });
    test("/escape escapes, /config imports TOML and YAML", async () => {
      const html = await (await fetch(url(3019, "/escape?name=" + encodeURIComponent("<script>x</script>")))).text();
      expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
      expect(html).not.toContain("<script>");
      const cfg = (await (await fetch(url(3019, "/config"))).json()) as { app: { server: { port: number } }; features: { beta: boolean } };
      expect(cfg.app.server.port).toBe(8080);
      expect(cfg.features.beta).toBe(true);
    });
  });

  describe("[20] runtime versions (1.4.5)", () => {
    test("/versions reports the running Bun and its libraries", async () => {
      const v = (await (await fetch(url(3020, "/versions"))).json()) as Record<string, any>;
      expect(v.bun).toBe(Bun.version);
      expect(v.libraries.llhttp).toBe(process.versions.llhttp);
      expect(v.sqlite.inUse).toMatch(/^3\.\d+\.\d+$/);
      expect(v.sqlite.has354Rules).toBe(Bun.semver.satisfies(v.sqlite.inUse, ">=3.54.0"));
    });
    test("/require is a semver gate; a malformed version is 400", async () => {
      const now = (await (await fetch(url(3020, "/require?min=1.4.5"))).json()) as { ok: boolean };
      expect(now.ok).toBe(Bun.semver.satisfies(Bun.version, ">=1.4.5"));
      expect(await (await fetch(url(3020, "/require?min=99.0.0"))).json()).toMatchObject({ ok: false, order: -1 });
      expect((await fetch(url(3020, "/require?min=latest"))).status).toBe(400);
      expect(((await (await fetch(url(3020, "/changes"))).json()) as { release: string }).release).toBe("1.4.5");
    });
  });

  describe("[21] websocket", () => {
    test("connected + echo", async () => {
      const c = await wsOpen("ws://127.0.0.1:3021/ws");
      await c.waitFor((m) => m === "connected");
      c.ws.send("hi");
      expect(await c.waitFor((m) => m.startsWith("echo:"))).toBe("echo: hi");
      await c.close();
    });
  });

  describe("[22] cors", () => {
    test("preflight 204 + CORS headers on the real request", async () => {
      const pre = await fetch(url(3022, "/api/hello"), { method: "OPTIONS", headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "GET" } });
      expect(pre.status).toBe(204);
      expect(pre.headers.get("access-control-allow-origin")).toBe("*");
      const res = await fetch(url(3022, "/api/hello"), { headers: { Origin: "http://localhost:5173" } });
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(await res.json()).toEqual({ message: "cors ok" });
    });
  });

  describe("[23] upload", () => {
    test("multipart upload is saved (then removed by the test)", async () => {
      const form = new FormData();
      form.append("file", new File(["hello upload"], "../evil name.txt", { type: "text/plain" }));
      const res = await fetch(url(3023, "/upload"), { method: "POST", body: form });
      const body = (await res.json()) as { saved: string; size: number };
      expect(body.size).toBe(12);
      expect(body.saved.startsWith(`${DIR}/_uploads/`)).toBe(true); // "/" was replaced, so it stayed in the folder
      expect(await Bun.file(body.saved).text()).toBe("hello upload");
      await Bun.file(body.saved).delete();
      expect((await fetch(url(3023, "/upload"), { method: "POST", body: new FormData() })).status).toBe(400);
    });
  });

  describe("[24] sse", () => {
    test("10 data events, then a final 'done' event (FIXED: stops browser reconnects)", async () => {
      const res = await fetch(url(3024, "/events"));
      expect(res.headers.get("content-type")).toBe("text/event-stream");
      const text = await res.text(); // the stream ends after ~5 s
      expect(text).toContain('data: {"n":1');
      expect(text).toContain('data: {"n":10');
      expect(text.trimEnd().endsWith("event: done\ndata: {}")).toBe(true);
      expect(await (await fetch(url(3024))).text()).toContain('addEventListener("done"');
    }, 9000);
  });

  describe("[25] auth", () => {
    test("401 without or with a wrong token, 200 with the right one", async () => {
      const no = await fetch(url(3025, "/admin"));
      expect(no.status).toBe(401);
      expect(no.headers.get("www-authenticate")).toBe("Bearer");
      expect((await fetch(url(3025, "/admin"), { headers: { Authorization: "Bearer s3creT" } })).status).toBe(401);
      expect((await fetch(url(3025, "/admin"), { headers: { Authorization: "Bearer s3cret-and-more" } })).status).toBe(401);
      expect(await (await fetch(url(3025, "/admin"), { headers: { Authorization: "Bearer s3cret" } })).json()).toEqual({ secret: 42, message: "인증 성공" });
    });
  });

  describe("[26] middleware", () => {
    test("X-Request-Id added by middleware", async () => {
      const res = await fetch(url(3026, "/api/hello"));
      expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f]{8}$/);
      expect(await res.json()).toEqual({ message: "middleware ok" });
    });
  });

  describe("[27] static dir", () => {
    test("files, traversal blocked, 404", async () => {
      expect(await (await fetch(url(3027, "/hello.txt"))).text()).toBe("static dir ok\n");
      expect(await (await fetch(url(3027, "/"))).text()).toContain("<h1>Public</h1>");
      expect((await fetch(url(3027, "/%2e%2e/secret.txt"))).status).toBe(404); // URL normalized, stays in the folder
      expect((await fetch(url(3027, "/missing.txt"))).status).toBe(404);
    });
    test("FIXED: malformed %-escape -> 400 (was 500), hidden files refused", async () => {
      expect((await fetch(url(3027, "/%E0%A4%A"))).status).toBe(400);
      expect((await fetch(url(3027, "/.env"))).status).toBe(400);
      expect((await fetch(url(3027, "/sub/.git/config"))).status).toBe(400);
    });
  });

  describe("[28] stream", () => {
    test("chunks arrive in order", async () => {
      expect(await (await fetch(url(3028, "/stream"))).text()).toBe("하나\n둘\n셋\n끝\n");
    });
  });

  describe("[29] ws pub/sub", () => {
    test("a message reaches everyone in the room", async () => {
      const ada = await wsOpen("ws://127.0.0.1:3029/ws?user=ada&room=test-room");
      const bob = await wsOpen("ws://127.0.0.1:3029/ws?user=bob&room=test-room");
      await ada.waitFor((m) => m === "* bob joined");
      ada.ws.send("hi bob");
      expect(await bob.waitFor((m) => m === "ada: hi bob")).toBe("ada: hi bob");
      expect(await ada.waitFor((m) => m === "ada: hi bob")).toBe("ada: hi bob"); // server.publish includes the sender
      await bob.close();
      await ada.waitFor((m) => m === "* bob left");
      await ada.close();
    });
  });

  describe("[30] crud", () => {
    test("POST, PUT, PATCH, GET, DELETE", async () => {
      const created = (await (await fetch(url(3030, "/api/items"), json({ name: "pen" }))).json()) as { id: string; qty: number };
      expect(created.qty).toBe(1);
      const put = await fetch(url(3030, `/api/items/${created.id}`), { ...json({ name: "pencil", qty: 10 }), method: "PUT" });
      expect(((await put.json()) as { name: string }).name).toBe("pencil");
      const patch = await fetch(url(3030, `/api/items/${created.id}`), { ...json({ qty: 3 }), method: "PATCH" });
      expect(await patch.json()).toEqual({ id: created.id, name: "pencil", qty: 3 });
      expect((await fetch(url(3030, `/api/items/${created.id}`), { method: "DELETE" })).status).toBe(204);
      expect((await fetch(url(3030, `/api/items/${created.id}`))).status).toBe(404);
    });
    test("FIXED: invalid JSON -> 400 (was 500), qty type-checked", async () => {
      expect((await fetch(url(3030, "/api/items"), { method: "POST", body: "{bad" })).status).toBe(400);
      expect((await fetch(url(3030, "/api/items"), json({ name: "x", qty: "10" }))).status).toBe(400);
      expect((await fetch(url(3030, "/api/items/1"), { ...json({ name: "notebook", qty: -1 }), method: "PUT" })).status).toBe(400);
      expect((await fetch(url(3030, "/api/items/1"), { ...json({ name: "" }), method: "PATCH" })).status).toBe(400);
      expect((await fetch(url(3030, "/api/items/1"), { method: "PATCH", body: "[]" })).status).toBe(400);
    });
  });

  describe("[31] sqlite", () => {
    test("create, read, delete (row removed again)", async () => {
      const res = await fetch(url(3031, "/api/posts"), json({ title: "t", content: "c" }));
      expect(res.status).toBe(201);
      const { id } = (await res.json()) as { id: string };
      expect(((await (await fetch(url(3031, `/api/posts/${id}`))).json()) as { title: string }).title).toBe("t");
      expect((await fetch(url(3031, `/api/posts/${id}`), { method: "DELETE" })).status).toBe(204);
      expect((await fetch(url(3031, `/api/posts/${id}`))).status).toBe(404);
    });
  });

  describe("[32] SQLite 3.54 rules", () => {
    const post = (path: string, body: unknown) => fetch(url(3032, path), json(body));
    test("the raw ALTER TABLE ... rowid is refused exactly when SQLite is 3.54+", async () => {
      const r = (await (await fetch(url(3032))).json()) as { rules354: boolean; rawAlterAddRowid: { refused: boolean } };
      expect(r.rawAlterAddRowid.refused).toBe(r.rules354);
    });
    test("the API refuses reserved names on every version", async () => {
      for (const name of ["rowid", "OID", "_rowid_"]) expect((await post("/columns", { name })).status).toBe(422);
      expect((await post("/columns", { name: "bad name" })).status).toBe(422);
      const name = `c_${crypto.randomUUID().slice(0, 8)}`;
      expect((await post("/columns", { name })).status).toBe(201);
      expect((await post("/columns", { name })).status).toBe(409);
    });
    test("the authorizer allows reports and blocks everything else", async () => {
      const ok = (await (await post("/report", { sql: "SELECT name, upper(name) AS shout FROM products ORDER BY id" })).json()) as { rows: { shout: string }[] };
      expect(ok.rows.map((r) => r.shout)).toEqual(["APPLE", "BREAD", "CHEESE"]);
      expect((await post("/report", { sql: "SELECT * FROM users" })).status).toBe(403); // table not allowed
      expect((await post("/report", { sql: "DELETE FROM products" })).status).toBe(403); // not a SELECT
      expect((await post("/report", { sql: "SELECT random()" })).status).toBe(403); // function not allowed
      expect((await post("/report", { sql: "SELEC oops" })).status).toBe(400); // plain syntax error
    });
    test("functions in DEFAULT reach the authorizer only on 3.54+", async () => {
      const a = (await (await fetch(url(3032, "/authorizer"))).json()) as { rules354: boolean; functionsAsked: string[]; insert: string };
      expect(a.functionsAsked.includes("datetime")).toBe(a.rules354);
      expect(a.insert === "ok").toBe(!a.rules354);
    });
  });

  describe("[33] metrics", () => {
    test("requestIP and live counters", async () => {
      const who = (await (await fetch(url(3033, "/whoami"))).json()) as { ip: string };
      expect(who.ip).toContain("127.0.0.1");
      const m = (await (await fetch(url(3033, "/metrics"))).json()) as { port: number; pendingRequests: number };
      expect(m.port).toBe(3033);
      expect(m.pendingRequests).toBeGreaterThanOrEqual(1); // this very request
    });
  });

  describe("[34] rate limit", () => {
    test("5 allowed, then 429 with Retry-After", async () => {
      const codes: number[] = [];
      let last: Response | undefined;
      for (let i = 0; i < 7; i++) {
        last = await fetch(url(3034));
        codes.push(last.status);
      }
      expect(codes).toEqual([200, 200, 200, 200, 200, 429, 429]);
      expect(Number(last!.headers.get("retry-after"))).toBeGreaterThan(0);
    });
  });

  describe("[35] graceful", () => {
    test("/slow completes", async () => {
      expect(((await (await fetch(url(3035, "/slow"))).json()) as { done: boolean }).done).toBe(true);
    });
  });

  describe("[36] range", () => {
    test("206 for valid ranges, 416 for invalid", async () => {
      const a = await fetch(url(3036, "/file"), { headers: { Range: "bytes=0-11" } });
      expect(a.status).toBe(206);
      expect(await a.text()).toBe("Hello Range!");
      expect(a.headers.get("content-range")).toMatch(/^bytes 0-11\/\d+$/);
      const tail = await fetch(url(3036, "/file"), { headers: { Range: "bytes=-4" } });
      expect(await tail.text()).toBe("nd.\n"); // the file ends with a newline
      expect((await fetch(url(3036, "/file"), { headers: { Range: "bytes=9999-" } })).status).toBe(416);
    });
  });

  describe("[37] session", () => {
    test("login, me, logout, me = 401", async () => {
      const login = await fetch(url(3037, "/login"), json({ user: "ada" }));
      const jar = cookieHeader(login);
      expect(jar.sid).toMatch(/^[0-9a-f-]{36}$/);
      expect(((await (await fetch(url(3037, "/me"), { headers: { Cookie: cookieString(jar) } })).json()) as { user: string }).user).toBe("ada");
      await fetch(url(3037, "/logout"), { method: "POST", headers: { Cookie: cookieString(jar) } });
      expect((await fetch(url(3037, "/me"), { headers: { Cookie: cookieString(jar) } })).status).toBe(401);
    });
  });

  describe("[38] validation", () => {
    const post = (body: RequestInit["body"], type = "application/json") => fetch(url(3038, "/api/signup"), { method: "POST", headers: { "Content-Type": type }, body });
    test("415, 400, 413, 422 with every field, 201", async () => {
      expect((await post("{}", "text/plain")).status).toBe(415);
      expect((await post("{bad")).status).toBe(400);
      expect((await post(JSON.stringify({ name: "x".repeat(20_000) }))).status).toBe(413);
      const bad = await post(JSON.stringify({ email: "x", age: -1, emial: 1 }));
      expect(bad.status).toBe(422);
      const fields = ((await bad.json()) as { details: { field: string }[] }).details.map((d) => d.field).sort();
      expect(fields).toEqual(["age", "email", "emial", "name"]);
      const ok = await post(JSON.stringify({ email: "A@B.co", name: " Ada ", age: 36, tags: ["x", "x"] }));
      expect(ok.status).toBe(201);
      expect(((await ok.json()) as { created: unknown }).created).toEqual({ email: "a@b.co", name: "Ada", age: 36, tags: ["x"], newsletter: false });
    });
  });

  describe("[39] REST paging + If-Match", () => {
    test("cursor pages", async () => {
      const ids: number[] = [];
      let cursor: number | null = 0;
      let pages = 0;
      while (cursor !== null) {
        const r = (await (await fetch(url(3039, `/api/notes?limit=2&cursor=${cursor}`))).json()) as { items: { id: number }[]; nextCursor: number | null };
        ids.push(...r.items.map((n) => n.id));
        cursor = r.nextCursor;
        pages++;
      }
      expect(ids.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(pages).toBeGreaterThanOrEqual(3);
      const odd = (await (await fetch(url(3039, "/api/notes?tag=odd"))).json()) as { items: { id: number }[] };
      expect(odd.items.map((n) => n.id).slice(0, 3)).toEqual([1, 3, 5]);
    });
    test("Location on create, 412 on a stale version, delete", async () => {
      const res = await fetch(url(3039, "/api/notes"), json({ text: "t" }));
      expect(res.status).toBe(201);
      const loc = res.headers.get("location")!;
      const etag = res.headers.get("etag")!;
      const patch = (tag: string) => fetch(url(3039, loc), { method: "PATCH", headers: { "Content-Type": "application/json", "If-Match": tag }, body: JSON.stringify({ text: "edited" }) });
      const first = await patch(etag);
      expect(first.status).toBe(200);
      expect(first.headers.get("etag")).toBe('"2"');
      expect((await patch(etag)).status).toBe(412);
      expect((await fetch(url(3039, loc), { method: "DELETE" })).status).toBe(204);
      expect((await fetch(url(3039, "/api/notes/abc"))).status).toBe(400);
    });
  });

  describe("[40] ETag / 304", () => {
    test("If-None-Match and If-Modified-Since", async () => {
      const r = await fetch(url(3040, "/report"));
      const etag = r.headers.get("etag")!;
      expect((await fetch(url(3040, "/report"), { headers: { "If-None-Match": etag } })).status).toBe(304);
      expect((await fetch(url(3040, "/report"), { headers: { "If-None-Match": `W/${etag}, "other"` } })).status).toBe(304);
      expect((await fetch(url(3040, "/report"), { headers: { "If-Modified-Since": r.headers.get("last-modified")! } })).status).toBe(304);
      await fetch(url(3040, "/report/bump"), { method: "POST" });
      const after = await fetch(url(3040, "/report"), { headers: { "If-None-Match": etag } });
      expect(after.status).toBe(200);
      expect(after.headers.get("etag")).not.toBe(etag);
    });
  });

  describe("[41] NDJSON", () => {
    test("2000 lines, each a JSON object", async () => {
      const res = await fetch(url(3041, "/export.ndjson"));
      expect(res.headers.get("content-type")).toContain("application/x-ndjson");
      const rows = JSONL.parse(await res.text()) as { id: number }[];
      expect(rows.length).toBe(2000);
      expect(rows[1999]!.id).toBe(2000);
    });
  });

  describe("[42] slow & flaky", () => {
    test("server notices an aborted client", async () => {
      const before = ((await (await fetch(url(3042, "/stats"))).json()) as { aborted: number }).aborted;
      await fetch(url(3042, "/slow?ms=3000"), { signal: AbortSignal.timeout(100) }).catch(() => {});
      await Bun.sleep(100);
      expect(((await (await fetch(url(3042, "/stats"))).json()) as { aborted: number }).aborted).toBe(before + 1);
    });
    test("flaky fails twice, then works", async () => {
      const key = `t-${Date.now()}`;
      const codes = [];
      for (let i = 0; i < 3; i++) codes.push((await fetch(url(3042, `/flaky?key=${key}&fail=2`))).status);
      expect(codes).toEqual([503, 503, 200]);
    });
  });

  describe("[43] CSRF", () => {
    test("token from the form is required and bound to the session", async () => {
      const form = await fetch(url(3043, "/form"));
      const jar = cookieHeader(form);
      const token = /name="csrf" value="([^"]+)"/.exec(await form.text())![1]!;
      const send = (t: string, cookie = cookieString(jar), origin?: string) =>
        fetch(url(3043, "/transfer"), {
          method: "POST",
          headers: { Cookie: cookie, ...(origin ? { Origin: origin } : {}) },
          body: new URLSearchParams({ amount: "10", csrf: t }),
        });
      expect(await (await send(token)).json()).toEqual({ ok: true, transferred: 10 });
      expect((await send("")).status).toBe(403);
      expect((await send("garbage")).status).toBe(403);
      expect((await send(token, cookieString(jar), "https://evil.example")).status).toBe(403);
      const other = cookieHeader(await fetch(url(3043, "/form")));
      expect((await send(token, cookieString(other))).status).toBe(403); // token of another session
    });
  });

  describe("[44] HTMLRewriter", () => {
    test("rewrite and extract", async () => {
      const html = await (await fetch(url(3044, "/rewritten"))).text();
      expect(html).not.toContain("<script>");
      expect(html).toContain('<a href="https://bun.com" target="_blank" rel="noopener noreferrer">');
      expect(html).toContain('src="https://example.com/x.png"');
      expect(html).toContain('<p class="banner">');
      expect(await (await fetch(url(3044, "/extract"))).json()).toEqual({
        title: "Rewriter demo",
        headings: ["Guide", "Install", "Run"],
        links: ["https://bun.com", "/local"],
      });
    });
  });

  describe("[45] Bun.cron", () => {
    test("status, manual run, next times, invalid expression", async () => {
      const s = (await (await fetch(url(3045, "/status"))).json()) as { schedule: string; runs: number };
      expect(s.schedule).toBe("* * * * *");
      const r = (await (await fetch(url(3045, "/run-now"), { method: "POST" })).json()) as { runs: number };
      expect(r.runs).toBe(s.runs + 1);
      const n = (await (await fetch(url(3045, `/next?expr=${encodeURIComponent("0 9 * * MON-FRI")}&count=3&tz=Asia/Seoul`))).json()) as { next: string[] };
      expect(n.next.length).toBe(3);
      for (const t of n.next) expect(new Date(t).getUTCHours()).toBe(0); // 09:00 in Seoul = 00:00 UTC
      expect((await fetch(url(3045, "/next?expr=bad"))).status).toBe(400);
    });
  });

  describe("[46] shell & spawn", () => {
    test("interpolation is not shell injection", async () => {
      const r = (await (await fetch(url(3046, `/echo?text=${encodeURIComponent("; rm -rf / $(whoami)")}`))).json()) as { shellOutput: string };
      expect(r.shellOutput).toBe("; rm -rf / $(whoami)");
      expect(((await (await fetch(url(3046, "/bun-version"))).json()) as { stdout: string }).stdout).toBe(Bun.version);
      expect(((await (await fetch(url(3046, "/failing"))).json()) as { exitCode: number }).exitCode).not.toBe(0);
      expect((await fetch(url(3046, "/which?cmd=a;b"))).status).toBe(400);
    });
  });

  describe("[47] ★ bun test", () => {
    test("the demo suite passes; coverage table is printed", async () => {
      const r = (await (await fetch(url(3047, "/run?coverage=1"))).json()) as { exitCode: number; pass: number; fail: number; todo: number; output: string[] };
      expect(r).toMatchObject({ exitCode: 0, pass: 12, fail: 0, todo: 1 });
      expect(r.output.join("\n")).toContain("% Lines");
    }, 30_000);
    test("a failing test exits 1 and shows a diff", async () => {
      const r = (await (await fetch(url(3047, "/run-failing"))).json()) as { exitCode: number; fail: number; output: string[] };
      expect(r.exitCode).toBe(1);
      expect(r.fail).toBe(1);
      expect(r.output.join("\n")).toContain('"status": 201');
    }, 30_000);
  });

  describe("[48] toolchain", () => {
    test("bun run: script, shell script with npm_package_name, direct file", async () => {
      const r = (await (await fetch(url(3048, "/run"))).json()) as Record<string, { exitCode: number; stdout: string[] }>;
      expect(r["bun run hello"]!.stdout).toEqual(["hello from bun run, 2 + 3 = 5"]);
      expect(r["bun run greet"]!.stdout).toEqual(["hello from toolchain-demo"]);
      expect(r["bun ./src/hello.ts"]!.exitCode).toBe(0);
    }, 30_000);
    test("bun install, bun build", async () => {
      const i = (await (await fetch(url(3048, "/install"))).json()) as { exitCode: number };
      expect(i.exitCode).toBe(0);
      const b = (await (await fetch(url(3048, "/build"))).json()) as { exitCode: number; bundleBytes: number; bundleRuns: string[] };
      expect(b.exitCode).toBe(0);
      expect(b.bundleBytes).toBeGreaterThan(0);
      expect(b.bundleRuns).toEqual(["hello from bun run, 2 + 3 = 5"]);
    }, 30_000);
    test("bun check: 0 for good code, 1 + TS2322 for bad code", async () => {
      const r = (await (await fetch(url(3048, "/check"))).json()) as { good: { exitCode: number }; bad: { exitCode: number; code: string } };
      expect(r.good.exitCode).toBe(0);
      expect(r.bad).toMatchObject({ exitCode: 1, code: "TS2322" });
    }, 30_000);
    test("bun fmt: --check exits 1, stdin formatting", async () => {
      const r = (await (await fetch(url(3048, "/fmt"))).json()) as { check: { exitCode: number }; stdin: { exitCode: number; after: string } };
      expect(r.check.exitCode).toBe(1);
      expect(r.stdin.after).toBe("const point = { x: 1, y: 2 };\nexport { point };\n");
    }, 30_000);
  });

  describe("[49] ★ WebSockets", () => {
    test("Bun client with subprotocol: publish reaches the other client, not the sender", async () => {
      const r = (await (await fetch(url(3049, "/client-demo"))).json()) as { protocol: string; bobReceived: string; adaReceived: string[] };
      expect(r.protocol).toBe("chat.v1");
      expect(r.bobReceived).toBe("hi bob");
      expect(r.adaReceived).toContain("ack");
      expect(r.adaReceived).not.toContain("chat"); // publishToSelf: false
    });
    test("426 without upgrade, 400 for bad room or unsupported protocol", async () => {
      const plain = await fetch(url(3049, "/ws?room=lobby&name=x"));
      expect(plain.status).toBe(426);
      expect(plain.headers.get("upgrade")).toBe("websocket");
      expect((await fetch(url(3049, "/ws?room=BAD!&name=x"))).status).toBe(400);
      await expect(wsOpen("ws://127.0.0.1:3049/ws?room=lobby&name=x", { "Sec-WebSocket-Protocol": "chat.v9" })).rejects.toThrow();
    });
    test("HTTP broadcast reaches a connected socket; member count", async () => {
      const room = `t-${crypto.randomUUID().slice(0, 8)}`;
      const c = await wsOpen(`ws://127.0.0.1:3049/ws?room=${room}&name=tester`);
      await c.waitFor((m) => m.includes('"welcome"'));
      expect(await (await fetch(url(3049, `/rooms/${room}`))).json()).toEqual({ room, members: 1 });
      await fetch(url(3049, `/rooms/${room}/broadcast`), { method: "POST", body: "deploy finished" });
      expect(JSON.parse(await c.waitFor((m) => m.includes('"system"')))).toEqual({ type: "system", text: "deploy finished" });
      await c.close();
    });
  });

  describe("[50] ★ Bun.sql", () => {
    test("filters, IN list, dynamic ORDER BY with allow-list", async () => {
      const active = (await (await fetch(url(3050, "/users?active=true"))).json()) as { active: boolean }[];
      expect(active.length).toBeGreaterThan(0);
      expect(active.every((u) => u.active)).toBe(true);
      const ids = (await (await fetch(url(3050, "/users/by-ids?ids=1,3"))).json()) as { id: number }[];
      expect(ids.map((u) => u.id)).toEqual([1, 3]);
      const sorted = (await (await fetch(url(3050, "/users/sorted?by=name&dir=desc"))).json()) as { name: string }[];
      expect(sorted.map((u) => u.name)).toEqual([...sorted.map((u) => u.name)].sort().reverse());
      expect((await fetch(url(3050, "/users/sorted?by=password"))).status).toBe(400);
    });
    test("insert ignores extra fields (role stays 'user'), 409 on duplicate, bulk", async () => {
      const tag = crypto.randomUUID().slice(0, 8);
      const res = await fetch(url(3050, "/users"), json({ name: "Eve", email: `eve-${tag}@example.com`, role: "admin" }));
      expect(res.status).toBe(201);
      expect(((await res.json()) as { role: string }).role).toBe("user");
      expect((await fetch(url(3050, "/users"), json({ name: "Eve", email: `eve-${tag}@example.com` }))).status).toBe(409);
      const bulk = await fetch(url(3050, "/users/bulk"), json([{ name: "F", email: `f-${tag}@x.io` }, { name: "G", email: `g-${tag}@x.io` }]));
      expect(await bulk.json()).toEqual({ inserted: 2 });
    });
    test("transaction rolls back as a whole; pipelined queries", async () => {
      expect(await (await fetch(url(3050, "/tx-demo"), { method: "POST" })).json()).toMatchObject({ rolledBack: true, error: "unique violation" });
      const p = (await (await fetch(url(3050, "/pipelining"))).json()) as { users: number; firstAsArray: unknown[] };
      expect(p.users).toBeGreaterThan(0);
      expect(p.firstAsArray).toEqual([1, "Alice"]);
    });
  });

  describe("[51] ★ Bun.redis", () => {
    test("INCR counter and cache-aside with TTL", async () => {
      const a = ((await (await fetch(url(3051, "/hits"))).json()) as { hits: number }).hits;
      const b = ((await (await fetch(url(3051, "/hits"))).json()) as { hits: number }).hits;
      expect(b).toBe(a + 1);
      const n = 1000 + Math.floor(Math.random() * 1000);
      expect(await (await fetch(url(3051, `/square?n=${n}`))).json()).toMatchObject({ square: n * n, cached: false });
      const hit = (await (await fetch(url(3051, `/square?n=${n}`))).json()) as { cached: boolean; ttl: number };
      expect(hit.cached).toBe(true);
      expect(hit.ttl).toBeGreaterThan(0);
    });
    test("hash + expire, pub/sub through a duplicate() connection, pipelining", async () => {
      await fetch(url(3051, "/profile?name=Alice&plan=pro"), { method: "POST" });
      expect(await (await fetch(url(3051, "/profile"))).json()).toMatchObject({ name: "Alice", plan: "pro" });
      const msg = `m-${crypto.randomUUID().slice(0, 8)}`;
      expect(await (await fetch(url(3051, `/publish?msg=${msg}`), { method: "POST" })).json()).toEqual({ receivers: 1 });
      await Bun.sleep(50);
      const events = (await (await fetch(url(3051, "/events"))).json()) as { message: string }[];
      expect(events.map((e) => e.message)).toContain(msg);
      expect(((await (await fetch(url(3051, "/pipelining"))).json()) as { commands: number }).commands).toBe(20);
    });
  });

  describe("[52] ★ Bun.s3", () => {
    test("presign works offline; download redirects; writes need a bucket", async () => {
      const p = (await (await fetch(url(3052, "/presign?key=uploads/avatar.png&method=PUT&type=image/png&expires=60"))).json()) as { url: string };
      expect(p.url).toContain("X-Amz-Signature=");
      expect(p.url).toContain("X-Amz-Expires=60");
      const dl = await fetch(url(3052, "/download/uploads/avatar.png"), { redirect: "manual" });
      expect(dl.status).toBe(302);
      expect(dl.headers.get("location")).toContain("/uploads/avatar.png?");
      expect((await fetch(url(3052, "/presign?key=../etc/passwd"))).status).toBe(400);
      expect((await fetch(url(3052, "/objects/uploads/x.txt"), { method: "PUT", body: "hi" })).status).toBe(503);
    });
  });

  describe("[53] ★ Bun Shell scripting", () => {
    test("every step, including the double-redirect pitfall", async () => {
      const r = (await (await fetch(url(3053, "/script"))).json()) as Record<string, any>;
      expect(r.glob).toEqual(["a.txt", "b.txt"]);
      expect(r.json).toEqual({ ok: true, n: 3 });
      expect(r.lines).toEqual(["alpha", "beta", ""]);
      expect(r.envReplaced).toBe("hi||");
      expect(r.envAdded).toBe("hi");
      expect(r.stdinFromResponse).toBe("3");
      expect(r.stdoutToBuffer).toBe("into-a-buffer");
      expect(r.error).toEqual({ name: "ShellError", exitCode: 1 });
      if (typeof r.gzip === "object") {
        expect(r.gzip.pipeForm).toBe(true);
        expect(r.gzip.doubleRedirect).toContain("fails on");
      }
    }, 15_000);
  });

  describe("[54] fetch extras", () => {
    test("unix socket, proxy, TLS with a CA, decompress: false", async () => {
      const r = (await (await fetch(url(3054, "/report"))).json()) as Record<string, any>;
      expect(r.unixSocket).toEqual({ status: 200, body: "OK" });
      expect(r.proxy).toEqual({ status: 200, proxySaw: ["GET http://127.0.0.1:3003/"] });
      expect(r.tlsWithCa).toEqual({ status: 200, protocol: "https" });
      expect(r.tlsWithoutCa.error).toBe("DEPTH_ZERO_SELF_SIGNED_CERT");
      expect(r.decompressFalse).toMatchObject({ contentEncoding: "gzip", gzipMagic: true });
    });
  });

  describe("[55] Bun.secrets", () => {
    test("disabled unless BUN_DEMO_SECRETS=1 (never touches the keychain in tests)", async () => {
      expect(await (await fetch(url(3055))).json()).toMatchObject({ enabled: false });
      expect((await fetch(url(3055, "/secret"))).status).toBe(503);
    });
  });

  describe("[56] RSA signatures (1.4.5 hashes)", () => {
    test("every listed hash signs and verifies", async () => {
      const r = (await (await fetch(url(3056, "/algorithms"))).json()) as { results: { alg: string; ok: boolean }[] };
      expect(r.results.filter((x) => !x.ok).map((x) => x.alg)).toEqual([]);
    });
    test("sign + verify round trip; tampering fails; PKCS#1 is deterministic, PSS is not", async () => {
      const sign = async (q: string) => ((await (await fetch(url(3056, `/sign?${q}`), { method: "POST", body: "hello" })).json()) as { signature: string }).signature;
      const verify = async (body: Record<string, unknown>) => ((await (await fetch(url(3056, "/verify"), json(body))).json()) as { valid: boolean }).valid;
      const s1 = await sign("alg=sha3-256");
      expect(await sign("alg=sha3-256")).toBe(s1);
      expect(await verify({ alg: "sha3-256", data: "hello", signature: s1 })).toBe(true);
      expect(await verify({ alg: "sha3-256", data: "hellO", signature: s1 })).toBe(false);
      expect(await verify({ alg: "sha256", data: "hello", signature: s1 })).toBe(false);
      const p1 = await sign("alg=ripemd160&pss=1");
      const p2 = await sign("alg=ripemd160&pss=1");
      expect(p1).not.toBe(p2);
      expect(await verify({ alg: "ripemd160", data: "hello", signature: p2, pss: true })).toBe(true);
      expect((await fetch(url(3056, "/sign?alg=md5"), { method: "POST", body: "x" })).status).toBe(422);
      expect(await (await fetch(url(3056, "/public-key"))).text()).toContain("BEGIN PUBLIC KEY");
    });
  });

  describe("[57] reload", () => {
    test("version switches to 2.0.0 after ~3 s on the same port", async () => {
      let version = "";
      const until = Date.now() + 6000;
      while (Date.now() < until) {
        version = ((await (await fetch(url(3057, "/api/version"))).json()) as { version: string }).version;
        if (version === "2.0.0") break;
        await Bun.sleep(200);
      }
      expect(version).toBe("2.0.0");
    }, 8000);
  });

  describe("[58] unix socket", () => {
    test("fetch over the socket file", async () => {
      const res = await fetch("http://localhost/", { unix: UNIX_SOCK });
      expect(((await res.json()) as { via: string }).via).toBe("unix");
    });
  });

  describe("[59] proxy", () => {
    test("/local works offline", async () => {
      expect(((await (await fetch(url(3059, "/local"))).json()) as { via: string }).via).toBe("local");
    });
    test("/proxy/* answers 200 online or 502 offline", async () => {
      const res = await fetch(url(3059, "/proxy/status/200"), { signal: AbortSignal.timeout(8000) }).catch(() => null);
      if (res) expect([200, 502]).toContain(res.status);
    }, 10_000);
  });

  describe("[60] timeout", () => {
    test("/slow-ok (server.timeout(req, 0)) always completes", async () => {
      const res = await fetch(url(3060, "/slow-ok"), { keepalive: false });
      expect(await res.json()).toEqual({ ok: true, waitedMs: 3000, timeout: "disabled" });
    }, 8000);
    test("/slow-default without server.timeout() either completes or is reset (timing-dependent, see the note in [60])", async () => {
      const outcome = await fetch(url(3060, "/slow-default"), { keepalive: false }).then(
        (r) => String(r.status),
        (e: { code?: string }) => e.code ?? "error",
      );
      expect(["200", "ECONNRESET"]).toContain(outcome);
    }, 8000);
  });

  describe("[61] route priority", () => {
    test("exact > param > wildcard > global", async () => {
      expect(await (await fetch(url(3061, "/api/users/me"))).json()).toEqual({ user: "current" });
      expect(await (await fetch(url(3061, "/api/users/42"))).json()).toEqual({ userId: "42" });
      expect(((await (await fetch(url(3061, "/api/other"))).json()) as { catch: string }).catch).toBe("api");
      const g = await fetch(url(3061, "/elsewhere"));
      expect(g.status).toBe(404);
      expect(((await g.json()) as { catch: string }).catch).toBe("global");
    });
  });

  describe("[62] tls / [64] http3", () => {
    test("HTTPS with the self-signed certificate", async () => {
      for (const port of [3062, 3064]) {
        const res = await fetch(`https://127.0.0.1:${port}/`, { tls: { rejectUnauthorized: false } });
        expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
      }
    });
  });

  describe("[63] TLS certificate errors (1.4.5)", () => {
    test("each failure has its own code", async () => {
      const { cases } = (await (await fetch(url(3063, "/check"))).json()) as { cases: Record<string, { got: Record<string, unknown> }> };
      const got = Object.values(cases).map((c) => c.got);
      expect(got[0]).toMatchObject({ ok: false, code: "CERT_HAS_EXPIRED" });
      expect(got[1]).toMatchObject({ ok: false, code: "CERT_HAS_EXPIRED" });
      expect(got[2]).toMatchObject({ ok: false, code: "DEPTH_ZERO_SELF_SIGNED_CERT" });
      expect(got[3]).toMatchObject({ ok: true, status: 200 });
      expect(got[4]).toMatchObject({ ok: false, code: "ERR_TLS_CERT_ALTNAME_INVALID" });
      expect(got[5]).toMatchObject({ ok: true, authorized: false, authorizationError: "CERT_HAS_EXPIRED" });
    });
    test("/certs reads both certificates with X509Certificate", async () => {
      const c = (await (await fetch(url(3063, "/certs"))).json()) as Record<string, { expired: boolean; selfIssued: boolean; subjectAltName: string }>;
      expect(c.expired).toMatchObject({ expired: true, selfIssued: true });
      expect(c.devCert!.expired).toBe(false);
      expect(c.devCert!.subjectAltName).toContain("127.0.0.1");
    });
  });

  describe("[65] html import", () => {
    test("bundled page and API", async () => {
      const page = await fetch(url(3065));
      expect(page.headers.get("content-type")).toContain("text/html");
      expect(await page.text()).toContain("<script");
      expect(typeof ((await (await fetch(url(3065, "/api/time"))).json()) as { now: number }).now).toBe("number");
    });
  });

  describe("[66] ws advanced", () => {
    test("welcome + corked echo", async () => {
      const c = await wsOpen("ws://127.0.0.1:3066/ws");
      await c.waitFor((m) => m.startsWith("welcome "));
      c.ws.send("x");
      expect(await c.waitFor((m) => m.startsWith("echo:"))).toBe("echo: x");
      await c.close();
    });
  });

  describe("[67] jwt", () => {
    test("valid token 200, tampered token 401", async () => {
      const { token } = (await (await fetch(url(3067, "/login"), json({ sub: "ada" }))).json()) as { token: string };
      const ok = await fetch(url(3067, "/secret"), { headers: { Authorization: `Bearer ${token}` } });
      expect(((await ok.json()) as { payload: { sub: string } }).payload.sub).toBe("ada");
      const [h, , s] = token.split(".");
      const forged = `${h}.${Buffer.from(JSON.stringify({ sub: "admin", exp: 9e9 })).toString("base64url")}.${s}`;
      expect((await fetch(url(3067, "/secret"), { headers: { Authorization: `Bearer ${forged}` } })).status).toBe(401);
    });
    test("FIXED: malformed tokens -> 401 (was 500)", async () => {
      for (const bad of ["a.b.c", "!!!.@@@.###", "x.y"]) {
        expect((await fetch(url(3067, "/secret"), { headers: { Authorization: `Bearer ${bad}` } })).status).toBe(401);
      }
    });
  });

  describe("[68] mini app", () => {
    test("list, create, read", async () => {
      expect(((await (await fetch(url(3068, "/api/users"))).json()) as unknown[]).length).toBeGreaterThanOrEqual(1);
      const u = (await (await fetch(url(3068, "/api/users"), json({ name: "lin" }))).json()) as { id: string };
      expect(await (await fetch(url(3068, `/api/users/${u.id}`))).json()).toEqual({ id: u.id, name: "lin" });
    });
  });

  describe("[69] production", () => {
    test("health, login, me, notes list (read only)", async () => {
      expect(await (await fetch(url(3069, "/health"))).json()).toEqual({ ok: true });
      const jar = cookieHeader(await fetch(url(3069, "/api/login"), json({ user: "test-user" })));
      expect(await (await fetch(url(3069, "/api/me"), { headers: { Cookie: cookieString(jar) } })).json()).toEqual({ user: "test-user" });
      expect(Array.isArray(await (await fetch(url(3069, "/api/notes"), { headers: { Cookie: cookieString(jar) } })).json())).toBe(true);
      expect((await fetch(url(3069, "/api/notes"))).status).toBe(401);
    });
    test("FIXED: WebSocket needs a session and uses the session's user name", async () => {
      expect((await fetch(url(3069, "/ws?user=mallory"))).status).toBe(401); // checked before the upgrade
      const jar = cookieHeader(await fetch(url(3069, "/api/login"), json({ user: "real-user" })));
      expect((await fetch(url(3069, "/ws?room=Bad Room"), { headers: { Cookie: cookieString(jar) } })).status).toBe(400);
      const c = await wsOpen("ws://127.0.0.1:3069/ws?room=test&user=mallory", { Cookie: cookieString(jar) });
      expect(await c.waitFor((m) => m.includes("joined"))).toBe("* real-user joined");
      await c.close();
    });
  });

  describe("[70] hardening", () => {
    test("small body ok, 20 KB body 413, errors are generic", async () => {
      expect(((await (await fetch(url(3070, "/echo"), { method: "POST", body: "hi" })).json()) as { bytes: number }).bytes).toBe(2);
      expect((await fetch(url(3070, "/echo"), { method: "POST", body: new Uint8Array(20 * 1024) })).status).toBe(413);
      const boom = await fetch(url(3070, "/boom"));
      expect(boom.status).toBe(500);
      expect(await boom.json()).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("[71] ws.publish vs server.publish", () => {
    test("ws.publish skips the sender", async () => {
      const ada = await wsOpen("ws://127.0.0.1:3071/ws?user=ada");
      const bob = await wsOpen("ws://127.0.0.1:3071/ws?user=bob");
      await ada.waitFor((m) => m.includes("bob joined"));
      ada.ws.send(JSON.stringify({ mode: "ws" }));
      await bob.waitFor((m) => m.startsWith("[ws.publish] ada"));
      await ada.waitFor((m) => m.startsWith("[local]"));
      expect(ada.messages.some((m) => m.startsWith("[ws.publish]"))).toBe(false);
      ada.ws.send(JSON.stringify({ mode: "server" }));
      await ada.waitFor((m) => m.startsWith("[server.publish] ada"));
      await bob.waitFor((m) => m.startsWith("[server.publish] ada"));
      await ada.close();
      await bob.close();
    });
  });

  describe("[72] background jobs", () => {
    test("202 + Location, polling until done, 422", async () => {
      const res = await fetch(url(3072, "/jobs"), json({ rounds: 20_000 }));
      expect(res.status).toBe(202);
      const loc = res.headers.get("location")!;
      let job = { status: "" } as { status: string; result?: string };
      for (let delay = 20; job.status !== "done"; delay = Math.min(delay * 2, 500)) {
        job = (await (await fetch(url(3072, loc))).json()) as typeof job;
        if (job.status !== "done") await Bun.sleep(delay);
      }
      expect(job.result).toMatch(/^[0-9a-f]{64}$/);
      expect((await fetch(url(3072, "/jobs"), json({ rounds: -1 }))).status).toBe(422);
    });
  });

  describe("[73] WebSocket RPC", () => {
    test("ids, errors, binary, rooms, rate limit", async () => {
      const a = await wsOpen("ws://127.0.0.1:3073/ws");
      const b = await wsOpen("ws://127.0.0.1:3073/ws");
      const call = (c: typeof a, id: number, method: string, params = {}) => {
        c.ws.send(JSON.stringify({ id, method, params }));
        return c.waitFor((m) => (JSON.parse(m) as { id?: number }).id === id).then((m) => JSON.parse(m) as { ok: boolean; result?: unknown; error?: { status: number } });
      };
      const [sum, unknown] = await Promise.all([call(a, 1, "add", { a: 2, b: 3 }), call(a, 2, "nope")]);
      expect(sum.result).toBe(5);
      expect(unknown.error!.status).toBe(404);

      const bytes = new Uint8Array([1, 2, 3, 4]);
      a.ws.send(bytes);
      const bin = JSON.parse(await a.waitFor((m) => m.includes('"binary"'))) as { size: number; sha256: string };
      expect(bin).toEqual({ type: "binary", size: 4, sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex") } as never);

      await call(a, 3, "room.join", { room: "r1" });
      await call(b, 4, "room.join", { room: "r1" });
      expect((await call(a, 5, "room.say", { room: "r1", text: "yo" })).result).toEqual({ delivered: 1 });
      await b.waitFor((m) => m.includes('"chat"') && m.includes('"yo"'));
      expect(a.messages.some((m) => m.includes('"chat"'))).toBe(false); // ws.publish skips the sender

      await Bun.sleep(1100); // refill the bucket
      for (let i = 100; i < 125; i++) b.ws.send(JSON.stringify({ id: i, method: "ping" }));
      await b.waitFor((m) => (JSON.parse(m) as { id?: number }).id === 124);
      const limited = b.messages.filter((m) => m.includes('"status":429')).length;
      expect(limited).toBeGreaterThanOrEqual(10);
      await a.close();
      await b.close();
    });
  });

  describe("[74] image service", () => {
    test("info, thumbnail, 415 for non-images", async () => {
      const png = makePng(320, 200);
      const info = (await (await fetch(url(3074, "/image/info"), { method: "POST", body: png })).json()) as { width: number; format: string };
      expect(info).toMatchObject({ width: 320, format: "png" });
      const thumb = await (await fetch(url(3074, "/image/thumb?w=64"), { method: "POST", body: png })).bytes();
      expect(await new Bun.Image(thumb).metadata()).toEqual({ width: 64, height: 40, format: "webp" });
      expect((await fetch(url(3074, "/image/info"), { method: "POST", body: "not an image" })).status).toBe(415);
    });
    test("strip removes EXIF and applies the orientation", async () => {
      const jpg = await jpegWithExif();
      expect(includes(jpg, "37.5665")).toBe(true);
      const res = await fetch(url(3074, "/image/strip"), { method: "POST", body: jpg });
      const out = await res.bytes();
      expect(res.headers.get("x-had-exif")).toBe("true");
      expect(res.headers.get("x-has-exif")).toBe("false");
      expect(includes(out, "37.5665")).toBe(false);
      expect(await new Bun.Image(out).metadata()).toEqual({ width: 20, height: 40, format: "jpeg" });
    });
  });

  describe("[75] one-folder vault", () => {
    const n = Date.now().toString(36);
    test("log round trip with ETag", async () => {
      const put = await fetch(url(3075, `/files/t-${n}.log`), { method: "PUT", body: "line 1\nline 2\n" });
      expect(put.status).toBe(201);
      const { sha256 } = (await put.json()) as { sha256: string };
      const get = await fetch(url(3075, `/files/t-${n}.log`));
      expect(get.headers.get("etag")).toBe(`"${sha256}"`);
      expect(get.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await get.text()).toBe("line 1\nline 2\n");
      expect((await fetch(url(3075, `/files/t-${n}.log`), { headers: { "If-None-Match": `"${sha256}"` } })).status).toBe(304);
      expect((await fetch(url(3075, `/files/t-${n}.log`), { method: "DELETE" })).status).toBe(204);
    });
    test("refuses what breaks the rule", async () => {
      const put = (name: string, body: RequestInit["body"]) => fetch(url(3075, `/files/${name}`), { method: "PUT", body });
      expect((await put("evil.sh", "x")).status).toBe(400);
      expect((await put("..%2Fx.log", "x")).status).toBe(400);
      expect((await put("fake.png", "x")).status).toBe(415);
      expect((await put("ansi.log", "a\x1b[2Jb")).status).toBe(415);
      expect((await put("photo.png", await new Bun.Image(makePng(8, 8)).jpeg().bytes())).status).toBe(415);
    });
    test("images are re-encoded: a hidden payload is not stored", async () => {
      const poly = new Uint8Array(Bun.concatArrayBuffers([makePng(16, 16), new TextEncoder().encode("<script>x</script>")]));
      const res = await fetch(url(3075, `/files/p-${n}.png`), { method: "PUT", body: poly });
      expect(((await res.json()) as { reencoded: boolean }).reencoded).toBe(true);
      expect(includes(await (await fetch(url(3075, `/files/p-${n}.png`))).bytes(), "<script>")).toBe(false);
      await fetch(url(3075, `/files/p-${n}.png`), { method: "DELETE" });
    });
  });

  describe("[76] workers", () => {
    test("worker and main thread compute the same hash", async () => {
      const [w, m] = await Promise.all([
        fetch(url(3076, "/hash/worker?rounds=20000")).then((r) => r.json() as Promise<{ hash: string; thread: string }>),
        fetch(url(3076, "/hash/main?rounds=20000")).then((r) => r.json() as Promise<{ hash: string }>),
      ]);
      expect(w.hash).toBe(m.hash);
      expect(w.thread).toBe("worker");
    });
  });

  describe("[77] TCP / UDP", () => {
    test("TCP line protocol", async () => {
      let got = "";
      await new Promise<void>((resolve, reject) => {
        void Bun.connect({
          hostname: "127.0.0.1",
          port: 3077,
          socket: {
            open: (s) => void s.write("hello\nquit\n"),
            data: (_s, d) => void (got += d.toString()),
            close: () => resolve(),
            error: (_s, e) => reject(e),
          },
        });
      });
      expect(got).toBe("hello from the TCP line server\nHELLO\nbye\n");
    });
    test("UDP echo", async () => {
      const reply = await new Promise<string>(async (resolve) => {
        const s = await Bun.udpSocket({ socket: { data: (sock, buf) => { resolve(buf.toString()); sock.close(); } } });
        s.send("ping", 3077, "127.0.0.1");
      });
      expect(reply).toBe("echo:ping");
    });
  });

  describe("[78] client patterns", () => {
    test("every pattern in the report passes", async () => {
      const r = (await (await fetch(url(3078, "/run"))).json()) as { ok: boolean; report: { name: string; ok: boolean; detail: unknown }[] };
      const failed = r.report.filter((x) => !x.ok);
      expect(failed).toEqual([]);
      expect(r.report.map((x) => x.name)).toEqual(["parallel", "allSettled", "timeout", "abort", "retry", "paging", "ndjson", "sse", "wsRpc"]);
    }, 15_000);
  });

  describe("[79] Bun.spawn IPC", () => {
    test("child hashes over IPC, times out, and is restarted after a crash", async () => {
      const h = (await (await fetch(url(3079, "/hash?text=hello"))).json()) as { hash: string; childPid: number; serverPid: number };
      expect(h.hash).toBe(new Bun.CryptoHasher("sha256").update("hello").digest("hex"));
      expect(h.childPid).not.toBe(h.serverPid);
      expect((await fetch(url(3079, "/slow?ms=1500"))).status).toBe(504);
      const c = (await (await fetch(url(3079, "/crash"), { method: "POST" })).json()) as { restarted: boolean; newPid: number };
      expect(c.restarted).toBe(true);
      const after = (await (await fetch(url(3079, "/hash?text=hello"))).json()) as { childPid: number };
      expect(after.childPid).toBe(c.newPid);
    }, 15_000);
  });

  describe("[80] ★ frontend", () => {
    test("dev routes bundle both pages; JSX without React", async () => {
      const page = await (await fetch(url(3080))).text();
      expect(page).toContain("<title>Frontend ★</title>");
      const js = /src="([^"]+\.js)"/.exec(page)?.[1];
      expect(js).toBeDefined();
      expect(await (await fetch(url(3080, js!))).text()).toContain("createElement");
      expect(await (await fetch(url(3080, "/dashboard"))).text()).toContain("<title>Dashboard ★</title>");
      expect(await (await fetch(url(3080, "/api/health"))).json()).toEqual({ ok: true });
    });
    test("Bun.build in memory: one shared CSS file, served from /dist with cache headers", async () => {
      const b = (await (await fetch(url(3080, "/build"))).json()) as { outputs: { path: string; kind: string }[] };
      expect(b.outputs.filter((o) => o.path.endsWith(".css"))).toHaveLength(1);
      expect(b.outputs.map((o) => o.path)).toContain("./index.html");
      const html = await fetch(url(3080, "/dist/index.html"));
      expect(html.headers.get("cache-control")).toBe("no-cache");
      const asset = /(chunk-[a-z0-9]+\.(?:js|css))/.exec(await html.text())?.[1];
      expect(asset).toBeDefined();
      expect((await fetch(url(3080, `/dist/${asset}`))).headers.get("cache-control")).toContain("immutable");
    });
  });

  describe("[81] ★ bun:ffi", () => {
    test("libsqlite3 version, libc calls, TinyCC compiled C", async () => {
      const r = (await (await fetch(url(3081, "/ffi"))).json()) as Record<string, any>;
      expect(String(r.sqliteVersion)).toMatch(/^3\.\d+\.\d+$/);
      expect(r.libc).toMatchObject({ sameAsProcessPid: true, strlen: 5, abs: 42 });
      expect(r.tinycc).toEqual({ sum: 10, greeting: "hello from C, compiled by TinyCC at runtime" });
    });
  });

  describe("choosing examples on the command line", () => {
    test("an unknown example prints usage and exits 2 without starting anything", async () => {
      const p = Bun.spawn([process.execPath, import.meta.path, "99", "nope"], { cwd: DIR, env: CHILD_ENV, stdout: "pipe", stderr: "pipe" });
      const [err, code] = await Promise.all([new Response(p.stderr).text(), p.exited]);
      expect(code).toBe(2);
      expect(err).toContain("unknown example(s): 99, nope");
      expect(err).toContain("usage: bun allblue.ts");
    });
  });

  describe("shutdown", () => {
    test("SIGINT stops every server and exits 0", async () => {
      proc!.kill("SIGINT");
      const code = await Promise.race([proc!.exited, Bun.sleep(8000).then(() => "timeout")]);
      expect(code).toBe(0);
      expect(stdout).toContain("graceful stop (81)");
      expect(await Bun.file(UNIX_SOCK).exists()).toBe(false);
    }, 10_000);
  });
}

// ----------------------------------------------------------------------------
// Entry point
// ----------------------------------------------------------------------------
if (process.env.NODE_ENV === "test") {
  await defineSelfTests(); // `bun test ./allblue.ts`
} else {
  process.on("SIGINT", () => void shutdownAll("SIGINT"));
  process.on("SIGTERM", () => void shutdownAll("SIGTERM"));
  await startExamples(selectExamples(Bun.argv.slice(2)));
}
