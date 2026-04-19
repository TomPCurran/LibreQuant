/**
 * Validation for user-defined environment variable names in `.env.local`.
 * Shared by server merge logic and the Data sources UI (no Node-only imports).
 */

export const MANAGED_SECRET_KEYS = [
  "ALPACA_API_KEY",
  "ALPACA_SECRET_KEY",
  "POLYGON_API_KEY",
  "TIINGO_API_KEY",
] as const;

export type ManagedSecretKey = (typeof MANAGED_SECRET_KEYS)[number];

const managedSet = new Set<string>(MANAGED_SECRET_KEYS);

const BLOCKED_CUSTOM_KEYS = new Set(
  [
    "PATH",
    "HOME",
    "USER",
    "SHELL",
    "PWD",
    "HOSTNAME",
    "NODE_ENV",
    "PORT",
    "JUPYTER_TOKEN",
    "JUPYTER_TOKEN_FILE",
    "PYTHONPATH",
    "LANG",
    "LC_ALL",
  ].map((s) => s.toUpperCase()),
);

const BLOCKED_PREFIXES = ["NEXT_PUBLIC_", "NEXT_PRIVATE_", "VERCEL_"];

/**
 * Default Postgres URL from Docker Compose — injected into Jupyter; do not set via Data sources UI.
 */
export const DEFAULT_DATABASE_URL_KEY = "LIBREQUANT_DATABASE_URL" as const;

/** @deprecated Use DEFAULT_DATABASE_URL_KEY */
export const NOTEBOOK_DATABASE_URL_KEY = DEFAULT_DATABASE_URL_KEY;

/** Pattern: LIBREQUANT_DB_{SLUG}_URL — additional notebook DB connections (Data sources UI). */
const USER_DB_URL_RE = /^LIBREQUANT_DB_[A-Z][A-Z0-9_]*_URL$/;

export function isUserDatabaseUrlKey(key: string): boolean {
  return USER_DB_URL_RE.test(key.trim());
}

/** Build env key from a user slug (e.g. ANALYTICS → LIBREQUANT_DB_ANALYTICS_URL). */
export function userDatabaseUrlEnvKey(slug: string): string {
  const s = slug.trim().toUpperCase().replace(/\s+/g, "_");
  return `LIBREQUANT_DB_${s}_URL`;
}

/** Display slug from env key, or null if not a user DB key. */
export function slugFromUserDatabaseUrlKey(key: string): string | null {
  const m = /^LIBREQUANT_DB_([A-Z][A-Z0-9_]*)_URL$/.exec(key.trim());
  return m?.[1] ?? null;
}

/** Validates slug segment before LIBREQUANT_DB_{slug}_URL (max length keeps full key ≤ 64). */
export function userDatabaseSlugError(slug: string): string | null {
  const s = slug.trim().toUpperCase();
  if (!s) return "Enter a connection name.";
  if (!/^[A-Z][A-Z0-9_]*$/.test(s)) {
    return "Use letters, digits, and underscore; start with a letter.";
  }
  if (userDatabaseUrlEnvKey(s).length > 64) {
    return "Name is too long for an environment variable (max 46 characters).";
  }
  return null;
}

/** Uppercase `A–Z`, digits, underscore; 1–64 chars; not managed or blocked. */
export function isCustomEnvKeyName(key: string): boolean {
  const k = key.trim();
  if (!k || k.length > 64) return false;
  if (k === DEFAULT_DATABASE_URL_KEY) return false;
  if (managedSet.has(k)) return false;
  if (BLOCKED_CUSTOM_KEYS.has(k)) return false;
  for (const p of BLOCKED_PREFIXES) {
    if (k.startsWith(p)) return false;
  }
  return /^[A-Z][A-Z0-9_]*$/.test(k);
}

/** Human-readable validation message, or null if valid. */
export function customEnvKeyNameError(key: string): string | null {
  const k = key.trim();
  if (!k) return "Enter a variable name.";
  if (k.length > 64) return "Name must be 64 characters or fewer.";
  if (!/^[A-Z][A-Z0-9_]*$/.test(k)) {
    return "Use only A–Z, 0–9, and underscore; start with a letter.";
  }
  if (managedSet.has(k)) {
    return "That name is reserved for built-in providers.";
  }
  if (k === DEFAULT_DATABASE_URL_KEY) {
    return "LIBREQUANT_DATABASE_URL is reserved for Docker Compose Postgres. Use Additional database connections below.";
  }
  if (isUserDatabaseUrlKey(k)) {
    return "Use Additional database connections below instead of a custom key.";
  }
  if (BLOCKED_CUSTOM_KEYS.has(k)) {
    return "That variable name is not allowed.";
  }
  for (const p of BLOCKED_PREFIXES) {
    if (k.startsWith(p)) {
      return `Names starting with ${p} are not allowed.`;
    }
  }
  return null;
}
