#!/usr/bin/env node
/**
 * One-shot local stack: Docker Jupyter + Next.js dev server.
 *
 * Usage:
 *   npm run dev:stack
 *   node scripts/dev-stack.mjs
 *
 * Options:
 *   --no-docker     Skip Docker; only run `npm run dev` (Jupyter must already be up)
 *   --keep-jupyter  On Ctrl+C, leave the Jupyter container running (default: docker compose down)
 */

import { spawn, execSync } from "node:child_process";
import { createConnection } from "node:net";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/**
 * Parse `.env.local` for keys used before Next loads env (dev-stack runs outside Next).
 * @returns {Record<string, string>}
 */
function readEnvLocalKeys() {
  const envLocal = path.join(root, ".env.local");
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
 * Align with `normalizeLocalJupyterBaseUrl` in `lib/env.ts` for the probe URL only.
 * @param {string} raw
 */
function normalizeJupyterBaseUrlForProbe(raw) {
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
 * @param {number} timeoutMs
 */
async function waitForJupyterHttpReady(baseUrl, token, timeoutMs = 90_000) {
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

function resolveJupyterProbeConfig() {
  const fromFile = readEnvLocalKeys();
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

function waitForPort(port, host = "127.0.0.1", timeoutMs = 90_000) {
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

function ensureEnvLocal() {
  const envExample = path.join(root, ".env.example");
  const envLocal = path.join(root, ".env.local");
  if (!existsSync(envLocal) && existsSync(envExample)) {
    copyFileSync(envExample, envLocal);
    console.log("[librequant] Created .env.local from .env.example");
  } else if (!existsSync(envLocal)) {
    console.warn(
      "[librequant] No .env.local found — copy .env.example if the app cannot reach Jupyter.",
    );
  }
}

function main() {
  const args = process.argv.slice(2);
  const noDocker = args.includes("--no-docker");
  const keepJupyter = args.includes("--keep-jupyter") || args.includes("-k");

  ensureEnvLocal();

  if (!noDocker) {
    console.log("[librequant] Starting Jupyter: docker compose up -d");
    try {
      execSync("docker compose up -d", { cwd: root, stdio: "inherit" });
    } catch {
      process.exit(1);
    }
    console.log("[librequant] Waiting for Jupyter on port 8888…");
    const probe = resolveJupyterProbeConfig();
    waitForPort(8888)
      .then(() => {
        console.log("[librequant] Port open; waiting for Jupyter HTTP API…");
        return waitForJupyterHttpReady(probe.baseUrl, probe.token);
      })
      .then(() => {
        console.log("[librequant] Jupyter HTTP API is ready.");
        startNext(keepJupyter, noDocker);
      })
      .catch((err) => {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      });
  } else {
    startNext(keepJupyter, noDocker);
  }
}

function startNext(keepJupyter, noDocker) {
  console.log("[librequant] Starting Next.js (npm run dev) — http://localhost:3000");
  console.log(
    "[librequant] Press Ctrl+C to stop the dev server" +
      (noDocker || keepJupyter ? ".\n" : "; Jupyter container will be stopped.\n"),
  );

  // Do not use shell: true — it breaks npm's PATH for scripts (`next` not in node_modules/.bin).
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  let tornDown = false;
  function tearDownJupyter() {
    if (tornDown || noDocker || keepJupyter) return;
    tornDown = true;
    console.log("\n[librequant] Stopping Jupyter: docker compose down");
    try {
      execSync("docker compose down", { cwd: root, stdio: "inherit" });
    } catch {
      /* ignore */
    }
  }

  function forwardSignalToNext() {
    if (child.exitCode != null) return;
    try {
      child.kill("SIGINT");
    } catch {
      /* child may already be gone */
    }
  }

  process.on("SIGINT", () => {
    forwardSignalToNext();
    tearDownJupyter();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    forwardSignalToNext();
    tearDownJupyter();
    process.exit(0);
  });

  child.on("exit", (code) => {
    tearDownJupyter();
    process.exit(code ?? 0);
  });
}

main();
