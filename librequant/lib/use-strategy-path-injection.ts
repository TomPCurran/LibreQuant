"use client";

/**
 * Injects the strategies library onto the notebook kernel's `sys.path` as soon as the kernel
 * can accept execution (retries until the notebook adapter exists — avoids racing user cells),
 * and ensures `__init__.py` exists under each strategy folder via the Jupyter Contents API.
 *
 * @module use-strategy-path-injection
 */

import type { Contents } from "@jupyterlab/services";
import { notebookStore, useNotebookStore } from "@datalayer/jupyter-react";
import { useEffect, useRef, useState } from "react";
import {
  getJupyterUserHomeAbsolute,
  getStrategyLibraryRoot,
  isSafeAbsolutePathForKernelSnippet,
  strategiesPathProvidedByServer,
} from "@/lib/env";
import { normalizeJupyterPath } from "@/lib/jupyter-paths";
import {
  LIBREQUANT_KERNEL_RESTARTED,
  LIBREQUANT_KERNEL_RESTARTING,
  type LibreQuantKernelLifecycleDetail,
} from "@/lib/kernel-lifecycle-events";
import { ensureInitPyInAllStrategies } from "@/lib/strategy-contents";
import type { StrategyPathStatus } from "@/lib/stores/workbench-store";

/**
 * Tiny Python snippet that only touches `sys.path`.
 * File-system work (__init__.py creation) is handled on the frontend via the
 * Contents API so the kernel queue stays free for user cells.
 */
function strategyPathSetupCode(): string {
  const root = normalizeJupyterPath(getStrategyLibraryRoot());
  const absRoot = `${getJupyterUserHomeAbsolute()}/${root}`;
  if (!isSafeAbsolutePathForKernelSnippet(absRoot)) {
    console.error(
      "[use-strategy-path-injection] Refusing kernel inject: strategy path fails safety check",
    );
    return "pass  # librequant: sys.path injection skipped (invalid path configuration)";
  }

  return [
    "import sys as _sys, os as _os",
    `_strat_root = "${absRoot}"`,
    "if _os.path.isdir(_strat_root):",
    "    try:",
    "        while _strat_root in _sys.path:",
    "            _sys.path.remove(_strat_root)",
    "    except ValueError:",
    "        pass",
    "    _sys.path.insert(0, _strat_root)",
    "del _sys, _os, _strat_root",
  ].join("\n");
}

/** Small snippet; keep timeout modest so a wedged kernel does not block the queue for long. */
const INJECT_EXECUTE_TIMEOUT_S = 12;
const INJECT_RETRY_MS = 50;
/** Per attempt loop inside {@link injectWithRetries} — notebook adapter often appears shortly after mount. */
const INJECT_MAX_ATTEMPTS = 45;
/** After a full {@link injectWithRetries} failure, wait and run another wave (handles one-shot effect miss). */
const INJECT_INTER_WAVE_MS = 2000;
/** Max value of `injectWave` (0-based); 36 attempts total before giving up. */
const MAX_INJECT_WAVE_INDEX = 35;

async function injectOnce(notebookId: string): Promise<boolean> {
  const adapter = notebookStore.getState().selectNotebookAdapter(notebookId);
  if (!adapter) return false;

  try {
    await adapter.executeCode(strategyPathSetupCode(), {
      timeout: INJECT_EXECUTE_TIMEOUT_S,
    });
    return true;
  } catch (e) {
    console.error("[use-strategy-path-injection] executeCode failed", e);
    return false;
  }
}

async function injectWithRetries(notebookId: string): Promise<boolean> {
  for (let i = 0; i < INJECT_MAX_ATTEMPTS; i++) {
    const ok = await injectOnce(notebookId);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, INJECT_RETRY_MS));
  }
  console.error(
    "[use-strategy-path-injection] Could not inject strategies path: notebook adapter missing or execute failed after retries.",
  );
  return false;
}

export type StrategyPathInjectionResult = {
  status: StrategyPathStatus;
};

/**
 * After the notebook kernel is ready, silently execute a snippet that puts the
 * strategies root on `sys.path`. {@link ensureInitPyInAllStrategies} runs in parallel
 * (does not block injection) — listing/creating `__init__.py` files can take seconds;
 * `sys.path` only needs the directory to exist for imports once packages are ready.
 *
 * Re-injects after a kernel restart: when status is `starting` / `restarting`, and after
 * {@link notebookClearOutputsAndRestartKernel} dispatches {@link LIBREQUANT_KERNEL_RESTARTED}.
 * `RESTARTING` only blocks injection — invalidating there while the UI still reports `"idle"`
 * made `executeCode` race the restart and wedge the notebook.
 *
 * Also ensures every strategy directory has an `__init__.py` via the Jupyter
 * Contents API (no kernel execution needed).
 *
 * @param notebookId - Active notebook id from `@datalayer/jupyter-react` store.
 * @param kernelReady - When true, Jupyter kernel and service manager exist — start injection (do not
 *   wait for notebook JSON / `serverContentReady`; strategy path does not depend on file content).
 * @param contentsManager - Jupyter contents manager for `__init__.py` creation; may be null until ready.
 * @param kernelWebSocketConnected - When false, injection waits (avoids `executeCode` during reconnect).
 */
export function useStrategyPathInjection(
  notebookId: string,
  kernelReady: boolean,
  contentsManager: Contents.IManager | null,
  kernelWebSocketConnected: boolean,
): StrategyPathInjectionResult {
  const viaServerPath = strategiesPathProvidedByServer();

  const injectedRef = useRef(false);
  const injectGenRef = useRef(0);
  /** Set when {@link LIBREQUANT_KERNEL_RESTARTING} fires — blocks inject while still "idle" before restart finishes. */
  const kernelRestartPendingRef = useRef(false);
  /** Bumped on {@link LIBREQUANT_KERNEL_RESTARTED} so the inject effect re-runs (refs alone do not re-render). */
  const [restartEpoch, setRestartEpoch] = useState(0);
  /** Increments after a failed inject wave so we retry (first dev load often races the notebook adapter). */
  const [injectWave, setInjectWave] = useState(0);
  const [status, setStatus] = useState<StrategyPathStatus>("pending");
  const prevKernelStatusRef = useRef<string | undefined>(undefined);

  const kernelStatus = useNotebookStore((s) =>
    notebookId ? s.selectKernelStatus(notebookId) : undefined,
  );

  /** Package hygiene only — never blocks `sys.path` injection (Contents API can be slow). */
  useEffect(() => {
    if (!contentsManager) return;
    void ensureInitPyInAllStrategies(contentsManager);
  }, [contentsManager, notebookId]);

  /** Strategies dir is on kernel `PYTHONPATH` (Docker); no `executeCode` injection. */
  useEffect(() => {
    if (!viaServerPath) return;
    queueMicrotask(() => {
      if (!kernelReady || !notebookId) {
        setStatus("pending");
        return;
      }
      setStatus("ready");
    });
  }, [viaServerPath, kernelReady, notebookId]);

  /**
   * `RESTARTING` must not invalidate injection while the kernel still reports `"idle"` — that
   * retriggers `executeCode` during `notebookClearOutputsAndRestartKernel` and corrupts the session.
   * Block injection until `RESTARTED`, then invalidate so we re-inject on the new kernel.
   */
  useEffect(() => {
    if (viaServerPath) return;

    const onRestarting = (ev: Event) => {
      const detail = (ev as CustomEvent<LibreQuantKernelLifecycleDetail>)
        .detail;
      if (!detail || detail.notebookId !== notebookId) return;
      kernelRestartPendingRef.current = true;
    };
    const onRestarted = (ev: Event) => {
      const detail = (ev as CustomEvent<LibreQuantKernelLifecycleDetail>)
        .detail;
      if (!detail || detail.notebookId !== notebookId) return;
      kernelRestartPendingRef.current = false;
      injectedRef.current = false;
      injectGenRef.current += 1;
      setInjectWave(0);
      setStatus("pending");
      setRestartEpoch((n) => n + 1);
    };

    window.addEventListener(LIBREQUANT_KERNEL_RESTARTING, onRestarting);
    window.addEventListener(LIBREQUANT_KERNEL_RESTARTED, onRestarted);
    return () => {
      window.removeEventListener(LIBREQUANT_KERNEL_RESTARTING, onRestarting);
      window.removeEventListener(LIBREQUANT_KERNEL_RESTARTED, onRestarted);
    };
  }, [notebookId, viaServerPath]);

  /** New kernel process loses `sys.path` tweaks — clear flag and drop stale inject attempts. */
  useEffect(() => {
    if (viaServerPath) return;

    if (kernelStatus === "restarting" || kernelStatus === "starting") {
      injectedRef.current = false;
      injectGenRef.current += 1;
      queueMicrotask(() => {
        setStatus("pending");
      });
    }
  }, [kernelStatus, viaServerPath]);

  /**
   * When the kernel becomes `idle` again after a restart, reinject `sys.path` even if custom
   * events were missed or the store skipped `restarting`. Also clears a stuck
   * `kernelRestartPendingRef` when we see `busy` → `idle` while a restart was pending.
   */
  useEffect(() => {
    if (viaServerPath) return;

    const prev = prevKernelStatusRef.current;
    prevKernelStatusRef.current = kernelStatus;

    if (kernelStatus !== "idle") return;

    const fromRestart =
      prev === "starting" ||
      prev === "restarting" ||
      (prev === "busy" && kernelRestartPendingRef.current);

    if (!fromRestart) return;

    kernelRestartPendingRef.current = false;
    injectedRef.current = false;
    injectGenRef.current += 1;
    queueMicrotask(() => {
      setStatus("pending");
      setInjectWave(0);
      setRestartEpoch((n) => n + 1);
    });
  }, [kernelStatus, viaServerPath]);

  useEffect(() => {
    if (viaServerPath) return;

    if (!kernelReady || !notebookId) return;
    if (!kernelWebSocketConnected) return;
    if (kernelRestartPendingRef.current) return;
    if (
      kernelStatus === "busy" ||
      kernelStatus === "restarting" ||
      kernelStatus === "starting"
    )
      return;
    if (injectedRef.current) return;
    if (injectWave > MAX_INJECT_WAVE_INDEX) return;

    let cancelled = false;
    const gen = ++injectGenRef.current;

    void (async () => {
      if (injectWave > 0) {
        await new Promise((r) => setTimeout(r, INJECT_INTER_WAVE_MS));
      }
      if (cancelled || gen !== injectGenRef.current) return;

      setStatus("pending");
      const ok = await injectWithRetries(notebookId);
      if (cancelled || gen !== injectGenRef.current) return;

      if (ok) {
        injectedRef.current = true;
        setStatus("ready");
      } else if (injectWave < MAX_INJECT_WAVE_INDEX) {
        setInjectWave((w) => w + 1);
      } else {
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    notebookId,
    kernelReady,
    kernelWebSocketConnected,
    kernelStatus,
    restartEpoch,
    injectWave,
    viaServerPath,
  ]);

  useEffect(() => {
    if (viaServerPath) {
      injectGenRef.current += 1;
      kernelRestartPendingRef.current = false;
      prevKernelStatusRef.current = undefined;
      queueMicrotask(() => {
        setInjectWave(0);
      });
      return;
    }

    injectedRef.current = false;
    injectGenRef.current += 1;
    kernelRestartPendingRef.current = false;
    prevKernelStatusRef.current = undefined;
    queueMicrotask(() => {
      setInjectWave(0);
      setStatus("pending");
    });
  }, [notebookId, viaServerPath]);

  return { status };
}
