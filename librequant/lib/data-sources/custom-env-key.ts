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

/** Uppercase `A–Z`, digits, underscore; 1–64 chars; not managed or blocked. */
export function isCustomEnvKeyName(key: string): boolean {
  const k = key.trim();
  if (!k || k.length > 64) return false;
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
