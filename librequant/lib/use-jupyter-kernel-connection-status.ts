"use client";

import type { Kernel as DatalayerKernel } from "@datalayer/jupyter-react";
import type { Kernel as JupyterKernel } from "@jupyterlab/services";
import { useSyncExternalStore } from "react";

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
