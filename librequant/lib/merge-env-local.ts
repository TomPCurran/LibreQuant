/**
 * Merge server-only secrets into `librequant/.env.local` without exposing values to the client.
 *
 * @module merge-env-local
 */

import fs from "node:fs/promises";
import path from "node:path";

import {
  isCustomEnvKeyName,
  MANAGED_SECRET_KEYS,
  type ManagedSecretKey,
} from "@/lib/data-sources/custom-env-key";

export { MANAGED_SECRET_KEYS, type ManagedSecretKey } from "@/lib/data-sources/custom-env-key";

const managedSet = new Set<string>(MANAGED_SECRET_KEYS);

export function envLocalAbsolutePath(): string {
  return path.join(process.cwd(), ".env.local");
}

/** Names of custom (user-defined) env keys present in the map. */
export function listCustomEnvKeyNames(map: Map<string, string>): string[] {
  return [...map.keys()]
    .filter((k) => isCustomEnvKeyName(k) && Boolean(map.get(k)?.trim()))
    .sort();
}

function parseEnvLines(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function lineKey(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  return trimmed.slice(0, eq).trim();
}

function quoteForEnv(value: string): string {
  if (/[\s"'\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Read `.env.local` and return merged map of all keys (including managed).
 */
export async function readEnvLocalMap(): Promise<Map<string, string>> {
  const p = envLocalAbsolutePath();
  try {
    const raw = await fs.readFile(p, "utf8");
    return parseEnvLines(raw);
  } catch {
    return new Map();
  }
}

function stripManagedUiComments(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("# Data sources") || t.startsWith("# Custom API keys")
  );
}

/**
 * Merge managed and optional custom keys into `.env.local`.
 * Custom keys use validated names; empty string removes a custom key.
 */
export async function mergeEnvLocal(
  updates: Partial<Record<ManagedSecretKey, string>>,
  customUpdates?: Record<string, string>,
): Promise<void> {
  const p = envLocalAbsolutePath();
  let raw = "";
  try {
    raw = await fs.readFile(p, "utf8");
  } catch {
    raw = "";
  }

  const map = parseEnvLines(raw);
  for (const [k, v] of Object.entries(updates)) {
    if (!managedSet.has(k)) continue;
    if (v === undefined || v === "") {
      map.delete(k);
    } else {
      if (v.length > 4096) {
        throw new Error(`Value for ${k} is too long.`);
      }
      map.set(k, v);
    }
  }

  if (customUpdates) {
    for (const [k, v] of Object.entries(customUpdates)) {
      const key = k.trim();
      if (!isCustomEnvKeyName(key)) {
        throw new Error(`Invalid custom environment variable name: ${key}`);
      }
      if (v === undefined || v === "") {
        map.delete(key);
      } else {
        if (v.length > 4096) {
          throw new Error(`Value for ${key} is too long.`);
        }
        map.set(key, v);
      }
    }
  }

  const lines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (stripManagedUiComments(line)) {
      continue;
    }
    const lk = lineKey(line);
    if (lk && managedSet.has(lk)) {
      continue;
    }
    if (lk && isCustomEnvKeyName(lk)) {
      continue;
    }
    lines.push(line);
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const managedBlock: string[] = [];
  for (const k of MANAGED_SECRET_KEYS) {
    const v = map.get(k);
    if (v !== undefined && v.length > 0) {
      managedBlock.push(`${k}=${quoteForEnv(v)}`);
    }
  }

  const customNames = [...map.keys()]
    .filter((k) => isCustomEnvKeyName(k) && Boolean(map.get(k)?.trim()))
    .sort();

  const customBlock: string[] = [];
  for (const k of customNames) {
    const v = map.get(k);
    if (v !== undefined && v.length > 0) {
      customBlock.push(`${k}=${quoteForEnv(v)}`);
    }
  }

  let tail = "";
  if (managedBlock.length) {
    tail += "\n# Data sources (managed by LibreQuant UI)\n" + managedBlock.join("\n") + "\n";
  }
  if (customBlock.length) {
    tail +=
      "\n# Custom API keys (managed by LibreQuant UI)\n" + customBlock.join("\n") + "\n";
  }

  const body = (lines.length ? lines.join("\n") + "\n" : "") + tail;

  await fs.writeFile(p, body, { mode: 0o600, encoding: "utf8" });
}

const EXTRA_SYNC_KEYS = ["ALPACA_DATA_FEED"] as const;

/**
 * Text file written to Jupyter (`config/credentials.env`) so kernels pick up keys without
 * restarting Docker. Includes managed + custom keys and optional Alpaca feed override.
 */
export function buildDataSourceSecretsEnvString(map: Map<string, string>): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (k: string, raw: string | undefined) => {
    const v = raw?.trim();
    if (!v || seen.has(k)) return;
    seen.add(k);
    lines.push(`${k}=${quoteForEnv(v)}`);
  };
  for (const k of MANAGED_SECRET_KEYS) {
    push(k, map.get(k));
  }
  for (const k of EXTRA_SYNC_KEYS) {
    push(k, map.get(k));
  }
  for (const k of [...map.keys()].sort()) {
    if (!isCustomEnvKeyName(k)) continue;
    push(k, map.get(k));
  }
  if (lines.length === 0) {
    return "# LibreQuant data source keys (synced from Next.js — none set yet)\n";
  }
  return [
    "# LibreQuant data source keys — synced from Next.js; do not edit by hand unless needed.",
    "# Loaded by librequant.data on each get_bars() (python-dotenv, override=True).",
    ...lines,
  ].join("\n") + "\n";
}

export function presenceForStatus(
  keys: typeof MANAGED_SECRET_KEYS,
  map: Map<string, string>,
): Record<string, boolean> {
  const o: Record<string, boolean> = {};
  for (const k of keys) {
    o[k] = Boolean(map.get(k)?.trim());
  }
  return o;
}
