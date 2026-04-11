#!/usr/bin/env node
/**
 * Docker Jupyter + production Next (`npm run build` + `npm run start`).
 *
 * Usage:
 *   npm run prod:stack
 *   node scripts/prod-stack.mjs
 *
 * Options:
 *   --no-docker     Skip Docker; only build and start Next (Jupyter must already be up)
 *   --keep-jupyter  On exit, leave the Jupyter container running (default: docker compose down)
 */

import { spawn, execSync, execFileSync } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const librequantRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../..");

function readEnvLocalKeys() {
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

function runEnsureEnv() {
  const script = path.join(__dirname, "ensure-env.mjs");
  execFileSync(process.execPath, [script], { stdio: "inherit" });
}

function runBuildThenStart(keepJupyter, noDocker) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  console.log("[librequant] Running npm run build…");
  try {
    execSync("npm run build", { cwd: librequantRoot, stdio: "inherit", env: process.env });
  } catch {
    process.exit(1);
  }

  console.log("[librequant] Starting Next.js (npm run start) — http://localhost:3000");
  console.log(
    "[librequant] Press Ctrl+C to stop" +
      (noDocker || keepJupyter ? ".\n" : "; Jupyter container will be stopped.\n"),
  );

  const child = spawn(npmCmd, ["run", "start"], {
    cwd: librequantRoot,
    stdio: "inherit",
    env: process.env,
  });

  let tornDown = false;
  function tearDownJupyter() {
    if (tornDown || noDocker || keepJupyter) return;
    tornDown = true;
    console.log("\n[librequant] Stopping Jupyter: docker compose down");
    try {
      execSync("docker compose down", { cwd: repoRoot, stdio: "inherit" });
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

function main() {
  const args = process.argv.slice(2);
  const noDocker = args.includes("--no-docker");
  const keepJupyter = args.includes("--keep-jupyter") || args.includes("-k");

  runEnsureEnv();

  if (!noDocker) {
    console.log("[librequant] Starting Jupyter: docker compose up -d");
    try {
      execSync("docker compose up -d", { cwd: repoRoot, stdio: "inherit" });
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
        runBuildThenStart(keepJupyter, noDocker);
      })
      .catch((err) => {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      });
  } else {
    runBuildThenStart(keepJupyter, noDocker);
  }
}

main();
