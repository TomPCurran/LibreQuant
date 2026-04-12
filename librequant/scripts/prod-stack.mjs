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
const librequantRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../..");

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

  runEnsureEnv(__dirname, librequantRoot);

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
