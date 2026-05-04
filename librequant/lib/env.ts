/**
 * Browser-safe environment for Jupyter integration (Zod-validated `NEXT_PUBLIC_*` only).
 *
 * `NODE_ENV` and `NEXT_RUNTIME` are read via small helpers below — Next.js / Node inject these;
 * they are not copied into the Zod input object.
 *
 * Server-only variables (`MLFLOW_*`, etc.) live in {@link ./server-env}.
 *
 * Security: `librequant/SECURITY.md`.
 *
 * @module env
 */

import { z } from "zod";

const DEFAULT_JUPYTER_BASE_URL = "http://127.0.0.1:8888";
const DEFAULT_LOCAL_JUPYTER_TOKEN = "devtoken";
/** Default MLflow Tracking UI origin (must match `docker-compose` published port unless overridden). */
export const DEFAULT_MLFLOW_UI_URL = "http://127.0.0.1:5000";
const DEFAULT_JUPYTER_USER_HOME = "/home/jovyan";
const DEFAULT_NOTEBOOK_ROOT = "work/librequant";
const DEFAULT_MLFLOW_POLL_MS = 12_000;
const MIN_MLFLOW_POLL_MS = 1000;

const emptyToUndefined = (val: unknown): unknown => {
  if (val === undefined || val === null) return undefined;
  const t = String(val).trim();
  return t === "" ? undefined : t;
};

/**
 * Maps a Jupyter HTTP origin for local dev so CSP and runtime agree: replaces `localhost` with
 * `127.0.0.1` (Docker often binds IPv4 only; macOS may resolve `localhost` to `::1` first).
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

function isDefaultLocalJupyterBaseUrl(baseUrl: string): boolean {
  return baseUrl === "http://127.0.0.1:8888";
}

function isSafeUnixPathForPythonEmbed(s: string): boolean {
  if (s.length === 0 || s.length > 512) return false;
  if (/["\\\n\r\x00\x7f]/.test(s)) return false;
  if (!s.startsWith("/")) return false;
  if (!/^[/a-zA-Z0-9._\-]+$/.test(s)) return false;
  const segments = s.split("/").filter(Boolean);
  return !segments.some((seg) => seg === ".." || seg === ".");
}

function validateNotebookLibraryRoot(raw: string): string {
  const cleaned = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  if (
    !cleaned ||
    cleaned.includes("..") ||
    !/^[a-zA-Z0-9/._\-]+$/.test(cleaned)
  ) {
    throw new Error(
      `Invalid environment: NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT must be a safe relative path (no "..", allowed [a-zA-Z0-9/._-]); got: ${JSON.stringify(raw)}`,
    );
  }
  return cleaned;
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

/** Next / Node inject; not part of the Zod `NEXT_PUBLIC_*` object. */
export function readNodeEnv(): "development" | "production" | "test" {
  const v = process.env.NODE_ENV;
  if (v === "production" || v === "test" || v === "development") return v;
  return "development";
}

/** Used by `instrumentation.ts` (must not import `server-only` modules). */
export function isNodeNextRuntime(): boolean {
  return process.env.NEXT_RUNTIME === "nodejs";
}

const publicEnvInputSchema = z.object({
  NEXT_PUBLIC_JUPYTER_BASE_URL: z.preprocess(
    (v) => emptyToUndefined(v) ?? DEFAULT_JUPYTER_BASE_URL,
    z.string().url(),
  ),
  NEXT_PUBLIC_JUPYTER_TOKEN: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  NEXT_PUBLIC_MLFLOW_UI_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_JUPYTER_USER_HOME: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  NEXT_PUBLIC_CLIENT_LOG_PREFIX: z.string().optional(),
  NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  NEXT_PUBLIC_JUPYTER_VERBOSE: z.preprocess(
    emptyToUndefined,
    z.enum(["0", "1"]).optional(),
  ),
});

export type PublicEnv = {
  readonly jupyterBaseUrlNormalized: string;
  readonly jupyterTokenResolved: string;
  readonly mlflowUiUrlNormalized: string;
  readonly jupyterUserHomeAbsolute: string;
  readonly notebookLibraryRoot: string;
  readonly strategiesViaPythonpath: boolean;
  readonly mlflowExperimentsPollMs: number;
  readonly jupyterVerboseEnabled: boolean;
  /** `undefined` = unset (use default label); `""` = user disabled bracket prefix. */
  readonly clientLogPrefixRaw: string | undefined;
  readonly nodeEnv: "development" | "production" | "test";
};

function buildPublicEnv(): PublicEnv {
  const input = {
    NEXT_PUBLIC_JUPYTER_BASE_URL: process.env.NEXT_PUBLIC_JUPYTER_BASE_URL,
    NEXT_PUBLIC_JUPYTER_TOKEN: process.env.NEXT_PUBLIC_JUPYTER_TOKEN,
    NEXT_PUBLIC_MLFLOW_UI_URL: process.env.NEXT_PUBLIC_MLFLOW_UI_URL,
    NEXT_PUBLIC_JUPYTER_USER_HOME: process.env.NEXT_PUBLIC_JUPYTER_USER_HOME,
    NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT: process.env.NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT,
    NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH:
      process.env.NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH,
    NEXT_PUBLIC_CLIENT_LOG_PREFIX: process.env.NEXT_PUBLIC_CLIENT_LOG_PREFIX,
    NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS:
      process.env.NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS,
    NEXT_PUBLIC_JUPYTER_VERBOSE: process.env.NEXT_PUBLIC_JUPYTER_VERBOSE,
  };

  const parsed = publicEnvInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${formatZodIssues(parsed.error)}`);
  }
  const d = parsed.data;
  const nodeEnv = readNodeEnv();

  const jupyterBaseUrlNormalized = normalizeLocalJupyterBaseUrl(
    d.NEXT_PUBLIC_JUPYTER_BASE_URL,
  );

  const fromToken = d.NEXT_PUBLIC_JUPYTER_TOKEN;
  const jupyterTokenResolved =
    fromToken ??
    (nodeEnv === "development" || isDefaultLocalJupyterBaseUrl(jupyterBaseUrlNormalized)
      ? DEFAULT_LOCAL_JUPYTER_TOKEN
      : "");

  const mlflowUiRaw = d.NEXT_PUBLIC_MLFLOW_UI_URL ?? DEFAULT_MLFLOW_UI_URL;
  const mlflowUiUrlNormalized = normalizeLocalJupyterBaseUrl(mlflowUiRaw);

  let jupyterUserHomeAbsolute = DEFAULT_JUPYTER_USER_HOME;
  const homeRaw = d.NEXT_PUBLIC_JUPYTER_USER_HOME;
  if (homeRaw !== undefined) {
    if (!isSafeUnixPathForPythonEmbed(homeRaw)) {
      throw new Error(
        "Invalid environment: NEXT_PUBLIC_JUPYTER_USER_HOME is set but is not a safe POSIX absolute path (see isSafeUnixPathForPythonEmbed in lib/env.ts).",
      );
    }
    jupyterUserHomeAbsolute = homeRaw;
  }

  let notebookLibraryRoot = DEFAULT_NOTEBOOK_ROOT;
  const nbRootRaw = d.NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT;
  if (nbRootRaw !== undefined) {
    notebookLibraryRoot = validateNotebookLibraryRoot(nbRootRaw);
  }

  const strategiesViaPythonpath =
    d.NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH?.trim() !== "0";

  let mlflowExperimentsPollMs = DEFAULT_MLFLOW_POLL_MS;
  const pollRaw = d.NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS;
  if (pollRaw !== undefined) {
    const n = Number.parseInt(pollRaw, 10);
    if (!Number.isFinite(n) || n < MIN_MLFLOW_POLL_MS) {
      throw new Error(
        `Invalid environment: NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS must be an integer >= ${MIN_MLFLOW_POLL_MS}; got: ${JSON.stringify(pollRaw)}`,
      );
    }
    mlflowExperimentsPollMs = n;
  }

  const jupyterVerboseEnabled = d.NEXT_PUBLIC_JUPYTER_VERBOSE === "1";

  return Object.freeze({
    jupyterBaseUrlNormalized,
    jupyterTokenResolved,
    mlflowUiUrlNormalized,
    jupyterUserHomeAbsolute,
    notebookLibraryRoot,
    strategiesViaPythonpath,
    mlflowExperimentsPollMs,
    jupyterVerboseEnabled,
    clientLogPrefixRaw: d.NEXT_PUBLIC_CLIENT_LOG_PREFIX,
    nodeEnv,
  });
}

/** Typed, validated public (`NEXT_PUBLIC_*`) configuration. Parsed once at module load. */
export const publicEnv: PublicEnv = buildPublicEnv();

/**
 * Resolves base URL and authentication token for `@jupyterlab/services` / `@datalayer/jupyter-react`.
 */
export function getPublicJupyterConfig(): {
  baseUrl: string;
  token: string;
} {
  return {
    baseUrl: publicEnv.jupyterBaseUrlNormalized,
    token: publicEnv.jupyterTokenResolved,
  };
}

/**
 * Origin of the MLflow Tracking UI (sidebar preview iframe and “open in new tab” link).
 */
export function getPublicMlflowUiUrl(): string {
  return publicEnv.mlflowUiUrlNormalized;
}

/**
 * Whether `path` is safe to embed in a Python double-quoted string executed in the kernel
 * (no quotes, backslashes, or `..` segments).
 */
export function isSafeAbsolutePathForKernelSnippet(path: string): boolean {
  return isSafeUnixPathForPythonEmbed(path);
}

/**
 * Absolute filesystem prefix for the Jupyter **Linux user home** inside the container.
 */
export function getJupyterUserHomeAbsolute(): string {
  return publicEnv.jupyterUserHomeAbsolute;
}

/**
 * Jupyter **contents** path for the notebook library (segments only, no leading/trailing slashes).
 */
export function getNotebookLibraryRoot(): string {
  return publicEnv.notebookLibraryRoot;
}

/**
 * Jupyter contents path for the strategies package root (`strategies/` under the notebook library).
 */
export function getStrategyLibraryRoot(): string {
  return `${publicEnv.notebookLibraryRoot}/strategies`;
}

/**
 * When `true`, the Jupyter kernel environment already includes the strategies tree on
 * `PYTHONPATH` (e.g. Docker Compose).
 */
export function strategiesPathProvidedByServer(): boolean {
  return publicEnv.strategiesViaPythonpath;
}

/** Bracket prefix for `client-log.ts` (`""` = omit brackets; unset = default label). */
export function getClientLogBracketPrefix(): string {
  const raw = publicEnv.clientLogPrefixRaw;
  if (raw === "") return "";
  const label = raw ?? "LibreQuant";
  return `[${label}]`;
}
