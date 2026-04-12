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
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  resolveJupyterProbeConfig,
  runEnsureEnv,
  waitForJupyterHttpReady,
  waitForPort,
} from "./stack-common.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Next.js app directory (`librequant/`). */
const librequantRoot = path.resolve(__dirname, "..");
/** Repository root (`docker-compose.yml` lives here). */
const repoRoot = path.resolve(__dirname, "../..");

function main() {
  const args = process.argv.slice(2);
  const noDocker = args.includes("--no-docker");
  const keepJupyter = args.includes("--keep-jupyter") || args.includes("-k");

  runEnsureEnv(__dirname, librequantRoot, { warnIfMissingEnvLocal: true });

  if (!noDocker) {
    console.log("[librequant] Starting Jupyter: docker compose up -d");
    try {
      execSync("docker compose up -d", { cwd: repoRoot, stdio: "inherit" });
    } catch {
      process.exit(1);
    }
    console.log("[librequant] Waiting for Jupyter on port 8888…");
    const probe = resolveJupyterProbeConfig(librequantRoot);
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

main();
