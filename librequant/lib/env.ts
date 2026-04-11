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
 * Resolves base URL and authentication token for `@jupyterlab/services` / `@datalayer/jupyter-react`.
 *
 * @returns `baseUrl` without trailing slash; `token` non-empty in development (default `devtoken`)
 *   when `NEXT_PUBLIC_JUPYTER_TOKEN` is unset, empty in production unless set in env.
 *
 * @remarks
 * An **empty** `NEXT_PUBLIC_JUPYTER_TOKEN` must not be passed through: the library treats `""`
 * as an explicit token and skips built-in defaults, causing 403 on `/api/*`.
 */
export function getPublicJupyterConfig(): {
  baseUrl: string;
  token: string;
} {
  const raw =
    process.env.NEXT_PUBLIC_JUPYTER_BASE_URL ?? "http://localhost:8888";
  const baseUrl = raw.replace(/\/$/, "");
  const fromEnv = process.env.NEXT_PUBLIC_JUPYTER_TOKEN?.trim() ?? "";
  const token =
    fromEnv ||
    (process.env.NODE_ENV === "development" ? "devtoken" : "");
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
 * @remarks Default matches `quay.io/jupyter/scipy-notebook` and `librequant/docker-compose.yml`
 *   (`jupyter-librequant-work:/home/jovyan/work`). Override if the image uses a different user home.
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
