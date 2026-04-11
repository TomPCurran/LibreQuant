"use client";

/**
 * Injects the strategies library onto the notebook kernel's `sys.path` after the kernel is idle,
 * and ensures `__init__.py` exists under each strategy folder via the Jupyter Contents API.
 *
 * @module use-strategy-path-injection
 */

import type { Contents } from "@jupyterlab/services";
import { notebookStore, useNotebookStore } from "@datalayer/jupyter-react";
import { useEffect, useRef } from "react";
import {
  getJupyterUserHomeAbsolute,
  getStrategyLibraryRoot,
  isSafeAbsolutePathForKernelSnippet,
} from "@/lib/env";
import { normalizeJupyterPath } from "@/lib/jupyter-paths";
import { ensureInitPyInAllStrategies } from "@/lib/strategy-contents";

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
    "if _os.path.isdir(_strat_root) and _strat_root not in _sys.path:",
    "    _sys.path.insert(0, _strat_root)",
    "del _sys, _os, _strat_root",
  ].join("\n");
}

async function injectOnce(notebookId: string): Promise<boolean> {
  const adapter = notebookStore.getState().selectNotebookAdapter(notebookId);
  if (!adapter) return false;

  try {
    await adapter.executeCode(strategyPathSetupCode(), { timeout: 15 });
    return true;
  } catch (e) {
    console.error("[use-strategy-path-injection] executeCode failed", e);
    return false;
  }
}

/**
 * After the notebook kernel is ready, silently execute a snippet that puts the
 * strategies root on `sys.path`. Re-injects after a kernel restart (detected
 * via the kernel status transitioning back to "idle" from "restarting").
 *
 * Also ensures every strategy directory has an `__init__.py` via the Jupyter
 * Contents API (no kernel execution needed).
 *
 * @param notebookId - Active notebook id from `@datalayer/jupyter-react` store.
 * @param kernelReady - When false, path injection is skipped.
 * @param contentsManager - Jupyter contents manager for `__init__.py` creation; may be null until ready.
 */
export function useStrategyPathInjection(
  notebookId: string,
  kernelReady: boolean,
  contentsManager: Contents.IManager | null,
): void {
  const injectedRef = useRef(false);
  const initPyDoneRef = useRef(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

  const kernelStatus = useNotebookStore((s) =>
    notebookId ? s.selectKernelStatus(notebookId) : undefined,
  );

  useEffect(() => {
    if (!contentsManager || initPyDoneRef.current) return;
    initPyDoneRef.current = true;
    void ensureInitPyInAllStrategies(contentsManager);
  }, [contentsManager]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = kernelStatus;

    if (!kernelReady || !notebookId || kernelStatus !== "idle") return;

    const shouldInject = !injectedRef.current || prev === "restarting";
    if (!shouldInject) return;

    void injectOnce(notebookId).then((ok) => {
      if (ok) injectedRef.current = true;
    });
  }, [notebookId, kernelReady, kernelStatus]);

  useEffect(() => {
    injectedRef.current = false;
    initPyDoneRef.current = false;
    prevStatusRef.current = undefined;
  }, [notebookId]);
}
