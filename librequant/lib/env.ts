/**
 * Browser-safe environment helpers for Jupyter integration.
 *
 * All configuration here uses `NEXT_PUBLIC_*` variables (embedded in the client bundle).
 * Never put secrets here that must stay server-only; the Jupyter token is intentionally
 * public to the browser because `@datalayer/jupyter-react` runs in the client.
 *
 * Security and threat model: `librequant/SECURITY.md` (relative to the repo root).
 * @module env
 */

/**
 * Maps a Jupyter HTTP origin for local dev so CSP and runtime agree: replaces `localhost` with
 * `127.0.0.1` (Docker often binds IPv4 only; macOS may resolve `localhost` to `::1` first).
 *
 * CLI stack scripts use the same rules for valid URLs via `normalizeJupyterBaseUrlForProbe` in
 * `scripts/stack-common.mjs` (invalid URLs there fall back to a default origin for polling).
 *
 * @internal Used by `next.config.ts` CSP `connect-src` and should stay aligned with {@link getPublicJupyterConfig}.
 */
export function normalizeLocalJupyterBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  try {
    const u = new URL(trimmed);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
      return u.toString().replace(/\/$/, "");
    }
  } catch {
    /* invalid URL — return as trimmed */
  }
  return trimmed;
}

/**
 * Resolves base URL and authentication token for `@jupyterlab/services` / `@datalayer/jupyter-react`.
 *
 * @returns `baseUrl` without trailing slash. `token` is non-empty when `NEXT_PUBLIC_JUPYTER_TOKEN`
 *   is set, or when it is unset and the app uses the default local Jupyter URL
 *   (`http://127.0.0.1:8888` after {@link normalizeLocalJupyterBaseUrl}), in which case it defaults
 *   to `devtoken` (including in production, matching Docker Compose). In production with a
 *   non-default Jupyter origin and no token in env, `token` is empty — set `NEXT_PUBLIC_JUPYTER_TOKEN`
 *   before `next build`. Development also defaults to `devtoken` when unset.
 *
 * @remarks
 * An **empty** `NEXT_PUBLIC_JUPYTER_TOKEN` must not be passed through: the library treats `""`
 * as an explicit token and skips built-in defaults, causing 403 on `/api/*`.
 *
 * **Local Docker:** `docker-compose` binds Jupyter to `127.0.0.1:8888` only. On macOS, `localhost`
 * often resolves to IPv6 (`::1`) first, so `http://localhost:8888` can get `ECONNREFUSED` while
 * `127.0.0.1:8888` works. We normalize `localhost` → `127.0.0.1` for the Jupyter origin only.
 */
/** Matches Docker Compose `--IdentityProvider.token` default for local stacks. */
const DEFAULT_LOCAL_JUPYTER_TOKEN = "devtoken";

function isDefaultLocalJupyterBaseUrl(baseUrl: string): boolean {
  return baseUrl === "http://127.0.0.1:8888";
}

export function getPublicJupyterConfig(): {
  baseUrl: string;
  token: string;
} {
  const raw =
    process.env.NEXT_PUBLIC_JUPYTER_BASE_URL ?? "http://127.0.0.1:8888";
  const baseUrl = normalizeLocalJupyterBaseUrl(raw);
  const fromEnv = process.env.NEXT_PUBLIC_JUPYTER_TOKEN?.trim() ?? "";
  const token =
    fromEnv ||
    (process.env.NODE_ENV === "development" ||
    isDefaultLocalJupyterBaseUrl(baseUrl)
      ? DEFAULT_LOCAL_JUPYTER_TOKEN
      : "");
  return { baseUrl, token };
}

const DEFAULT_JUPYTER_USER_HOME = "/home/jovyan";
const DEFAULT_NOTEBOOK_ROOT = "work/librequant";

/**
 * Paths embedded in kernel Python must not break out of a quoted string (SEC: injection).
 * Allows normal POSIX absolute paths only.
 */
function isSafeUnixPathForPythonEmbed(s: string): boolean {
  if (s.length === 0 || s.length > 512) return false;
  if (/["\\\n\r\x00\x7f]/.test(s)) return false;
  if (!s.startsWith("/")) return false;
  if (!/^[/a-zA-Z0-9._\-]+$/.test(s)) return false;
  const segments = s.split("/").filter(Boolean);
  return !segments.some((seg) => seg === ".." || seg === ".");
}

/**
 * Absolute filesystem prefix for the Jupyter **Linux user home** inside the container.
 *
 * @returns Validated path from `NEXT_PUBLIC_JUPYTER_USER_HOME`, or `/home/jovyan` when unset or invalid.
 *
 * @remarks Default matches `quay.io/jupyter/scipy-notebook` and the repository root `docker-compose.yml`
 *   (host path bind-mounted to `/home/jovyan/work/librequant`). Override if the image uses a different user home.
 */
export function getJupyterUserHomeAbsolute(): string {
  const raw = process.env.NEXT_PUBLIC_JUPYTER_USER_HOME?.trim();
  if (!raw) return DEFAULT_JUPYTER_USER_HOME;
  if (!isSafeUnixPathForPythonEmbed(raw)) {
    console.warn(
      "[env] NEXT_PUBLIC_JUPYTER_USER_HOME ignored: unsafe characters or path shape; using default",
    );
    return DEFAULT_JUPYTER_USER_HOME;
  }
  return raw;
}

/**
 * Whether `path` is safe to embed in a Python double-quoted string executed in the kernel
 * (no quotes, backslashes, or `..` segments).
 *
 * @param path - Absolute POSIX path under the container filesystem.
 */
export function isSafeAbsolutePathForKernelSnippet(path: string): boolean {
  return isSafeUnixPathForPythonEmbed(path);
}

/**
 * Jupyter **contents** path for the notebook library (segments only, no leading/trailing slashes).
 *
 * @returns Default `work/librequant` or a validated override from `NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT`.
 *   Invalid env values log a warning and fall back to the default.
 *
 * @remarks Must match the layout under `/home/jovyan/work/...` when using `docker-compose.yml`.
 */
export function getNotebookLibraryRoot(): string {
  const raw =
    process.env.NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT?.trim() ?? DEFAULT_NOTEBOOK_ROOT;
  const cleaned = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  if (
    !cleaned ||
    cleaned.includes("..") ||
    !/^[a-zA-Z0-9/._\-]+$/.test(cleaned)
  ) {
    if (process.env.NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT?.trim()) {
      console.warn(
        "[env] NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT ignored: unsafe value; using default",
      );
    }
    return DEFAULT_NOTEBOOK_ROOT;
  }
  return cleaned;
}

/**
 * Jupyter contents path for the strategies package root (`strategies/` under the notebook library).
 *
 * @returns `{getNotebookLibraryRoot()}/strategies`
 */
export function getStrategyLibraryRoot(): string {
  return `${getNotebookLibraryRoot()}/strategies`;
}

/**
 * When `true`, the Jupyter kernel environment already includes the strategies tree on
 * `PYTHONPATH` (e.g. Docker Compose). The app skips per-session `executeCode` `sys.path` injection.
 *
 * - `NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH=0` — always use browser-side injection (fallback).
 * - Unset or any other value — assume server `PYTHONPATH` (default Docker stack). Only opt out with `0`.
 */
export function strategiesPathProvidedByServer(): boolean {
  const raw = process.env.NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH?.trim();
  if (raw === "0") return false;
  return true;
}
