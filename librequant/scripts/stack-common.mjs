/**
 * Shared helpers for `dev-stack.mjs` and `prod-stack.mjs` (runs outside Next — no TypeScript).
 *
 * For valid URLs, {@link normalizeJupyterBaseUrlForProbe} matches browser-side
 * `normalizeLocalJupyterBaseUrl` in `lib/env.ts` (localhost → 127.0.0.1, no trailing slash).
 * On parse failure the probe returns a default origin so the CLI can still poll Docker.
 *
 * @module stack-common
 */

import { execFileSync } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * Parse `.env.local` for keys used before Next loads env (stack scripts run outside Next).
 * @param {string} librequantRoot - Path to the Next.js app root (`librequant/`).
 * @returns {Record<string, string>}
 */
export function readEnvLocalKeys(librequantRoot) {
  const envLocal = path.join(librequantRoot, ".env.local");
  if (!existsSync(envLocal)) {
    return {};
  }
  try {
    const text = readFileSync(envLocal, "utf8");
    /** @type {Record<string, string>} */
    const out = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Jupyter HTTP origin for stack probes. Matches `normalizeLocalJupyterBaseUrl` in `lib/env.ts`
 * for valid URLs; on invalid input returns `http://127.0.0.1:8888` so polling still works.
 * @param {string} raw
 */
export function normalizeJupyterBaseUrlForProbe(raw) {
  const trimmed = raw.trim().replace(/\/$/, "");
  try {
    const u = new URL(trimmed);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return "http://127.0.0.1:8888";
  }
}

/**
 * Wait until Jupyter Server answers HTTP (TCP alone is not enough).
 * @param {string} baseUrl
 * @param {string} token
 * @param {number} [timeoutMs]
 */
export async function waitForJupyterHttpReady(baseUrl, token, timeoutMs = 90_000) {
  const origin = normalizeJupyterBaseUrlForProbe(baseUrl);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const rootUrl = origin.endsWith("/") ? origin : `${origin}/`;
      const url = new URL("api/kernels", rootUrl);
      url.searchParams.set("token", token);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        return;
      }
    } catch {
      /* server still starting */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for Jupyter HTTP API (${origin}/api/kernels)`,
  );
}

/**
 * @param {string} librequantRoot
 */
export function resolveJupyterProbeConfig(librequantRoot) {
  const fromFile = readEnvLocalKeys(librequantRoot);
  const token =
    process.env.JUPYTER_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_JUPYTER_TOKEN?.trim() ||
    fromFile.JUPYTER_TOKEN?.trim() ||
    fromFile.NEXT_PUBLIC_JUPYTER_TOKEN?.trim() ||
    "devtoken";
  const baseUrl =
    process.env.NEXT_PUBLIC_JUPYTER_BASE_URL?.trim() ||
    fromFile.NEXT_PUBLIC_JUPYTER_BASE_URL?.trim() ||
    "http://127.0.0.1:8888";
  return { baseUrl, token };
}

/**
 * @param {number} port
 * @param {string} [host]
 * @param {number} [timeoutMs]
 */
export function waitForPort(port, host = "127.0.0.1", timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const attempt = () => {
      const socket = createConnection({ port, host }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(
            new Error(
              `Timed out after ${timeoutMs}ms waiting for ${host}:${port} (is Docker running?)`,
            ),
          );
        } else {
          setTimeout(attempt, 400);
        }
      });
    };
    attempt();
  });
}

/**
 * @param {string} scriptsDir - Directory containing `ensure-env.mjs`
 * @param {string} librequantRoot
 * @param {{ warnIfMissingEnvLocal?: boolean }} [options]
 */
export function runEnsureEnv(scriptsDir, librequantRoot, options = {}) {
  const script = path.join(scriptsDir, "ensure-env.mjs");
  execFileSync(process.execPath, [script], { stdio: "inherit" });
  if (options.warnIfMissingEnvLocal) {
    const envLocal = path.join(librequantRoot, ".env.local");
    if (!existsSync(envLocal)) {
      console.warn(
        "[librequant] No .env.local — copy .env.example if the app cannot reach Jupyter.",
      );
    }
  }
}
