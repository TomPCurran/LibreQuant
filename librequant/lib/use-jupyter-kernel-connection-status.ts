"use client";

import type { Kernel as DatalayerKernel } from "@datalayer/jupyter-react";
import type { Kernel as JupyterKernel } from "@jupyterlab/services";
import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Tracks Jupyter kernel **WebSocket transport** (`connected` | `connecting` | `disconnected`)
 * from a JupyterLab `IKernelConnection` (e.g. `NotebookAdapter.kernel` when the notebook owns
 * the session kernel).
 */
export function useKernelConnectionTransportStatus(
  connection: JupyterKernel.IKernelConnection | null | undefined,
): JupyterKernel.ConnectionStatus | null {
  const conn = connection ?? null;

  return useSyncExternalStore(
    (onChange) => {
      if (!conn) {
        return () => {};
      }
      const handler = () => {
        onChange();
      };
      conn.connectionStatusChanged.connect(handler);
      return () => {
        conn.connectionStatusChanged.disconnect(handler);
      };
    },
    () => conn?.connectionStatus ?? null,
    () => null,
  );
}

/**
 * Tracks transport for a Datalayer `Kernel` wrapper (legacy `useJupyter` default kernel).
 */
export function useJupyterKernelConnectionStatus(
  kernel: DatalayerKernel | undefined,
): JupyterKernel.ConnectionStatus | null {
  return useKernelConnectionTransportStatus(kernel?.connection ?? undefined);
}

/**
 * Logs when the kernel WebSocket **re**connects after a drop (the same session that emits
 * `Connection lost, reconnecting in …` from `@jupyterlab/services`). Skips the initial
 * `connecting` → `connected` handshake for a new kernel. Works in dev and production (`console.info`).
 */
export function useLogKernelWebSocketReconnect(
  connection: JupyterKernel.IKernelConnection | null | undefined,
): void {
  const status = useKernelConnectionTransportStatus(connection);
  const prevRef = useRef<JupyterKernel.ConnectionStatus | null>(null);
  const everConnectedRef = useRef(false);

  useEffect(() => {
    everConnectedRef.current = false;
    prevRef.current = null;
  }, [connection]);

  useEffect(() => {
    if (status === null) {
      prevRef.current = null;
      return;
    }
    const prev = prevRef.current;

    if (status === "connected") {
      const mode =
        process.env.NODE_ENV === "production" ? "production" : "development";
      if (
        everConnectedRef.current &&
        (prev === "connecting" || prev === "disconnected")
      ) {
        console.info(
          `[librequant] Jupyter kernel WebSocket reconnected [${mode}] kernel=${connection?.id ?? "?"}`,
        );
      }
      everConnectedRef.current = true;
    }

    prevRef.current = status;
  }, [status, connection]);
}
