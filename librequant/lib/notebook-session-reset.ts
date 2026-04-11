import type { NotebookAdapter } from "@datalayer/jupyter-react";
import { notebookStore } from "@datalayer/jupyter-react";
import {
  LIBREQUANT_KERNEL_RESTARTED,
  LIBREQUANT_KERNEL_RESTARTING,
  type LibreQuantKernelLifecycleDetail,
} from "@/lib/kernel-lifecycle-events";

function dispatchLifecycle(
  name: string,
  detail: LibreQuantKernelLifecycleDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

const WS_POLL_MS = 80;
const KERNEL_IDLE_WAIT_MS = 25_000;
const KERNEL_WS_WAIT_MS = 45_000;

async function waitForKernelWebSocketConnected(
  notebookId: string,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const adapter = notebookStore.getState().selectNotebookAdapter(notebookId);
    const conn = adapter?.kernel;
    if (conn?.connectionStatus === "connected") {
      return;
    }
    await new Promise((r) => setTimeout(r, WS_POLL_MS));
  }
}

async function waitForKernelIdle(notebookId: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = notebookStore.getState().selectKernelStatus(notebookId);
    if (st === "idle" || st === undefined) {
      return;
    }
    await new Promise((r) => setTimeout(r, WS_POLL_MS));
  }
}

/**
 * Clears all code cell outputs (execution state in the document) and restarts the
 * Jupyter kernel (clears in-memory variables). Does not remove cells or change source.
 *
 * Emits {@link LIBREQUANT_KERNEL_RESTARTING} before work and
 * {@link LIBREQUANT_KERNEL_RESTARTED} after the kernel channel is ready again so hooks
 * can reinject `sys.path` without racing the WebSocket reconnect.
 */
export async function notebookClearOutputsAndRestartKernel(
  adapter: NotebookAdapter | undefined,
  notebookId: string,
): Promise<void> {
  if (!adapter) {
    return;
  }

  dispatchLifecycle(LIBREQUANT_KERNEL_RESTARTING, { notebookId });

  const nb = adapter.notebook;
  if (nb.model && nb.widgets.length > 0) {
    if (!nb.activeCell) {
      adapter.setActiveCell(0);
    }
    adapter.clearAllOutputs();
  }

  try {
    /** Notebook session owns the kernel (`useJupyter` does not start a default kernel). */
    await adapter.sessionContext.restartKernel();
    await waitForKernelWebSocketConnected(notebookId, KERNEL_WS_WAIT_MS);
    await waitForKernelIdle(notebookId, KERNEL_IDLE_WAIT_MS);
  } catch (e) {
    console.error("[librequant] Kernel restart or channel wait failed:", e);
  } finally {
    dispatchLifecycle(LIBREQUANT_KERNEL_RESTARTED, { notebookId });
  }
}
