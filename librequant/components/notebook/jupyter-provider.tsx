"use client";

import "@/lib/ensure-webpack-public-path";
import {
  jupyterReactStore,
  useJupyter,
  type IJupyterProps,
} from "@datalayer/jupyter-react";
import { useEffect } from "react";
import { getPublicJupyterConfig } from "@/lib/env";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";

/**
 * Opinionated Jupyter session hook with public env defaults (LibreQuant shell).
 *
 * Passes the app-wide `ServiceManager` from the root provider when present so
 * the notebook does not open a second manager (duplicate kernels / stale `GET /api/kernels/:id`
 * polls after a Jupyter restart are less likely).
 *
 * **`startDefaultKernel` is false:** the embedded `<Notebook>` is the sole kernel owner
 * (`startDefaultKernel` on that component). A second kernel from `useJupyter` + the notebook
 * session caused orphan kernels, 404 interrupts, and hung cells after reset.
 */
export function useLibreJupyterSession(props?: Partial<IJupyterProps>) {
  const { baseUrl, token } = getPublicJupyterConfig();
  const { serviceManager } = useJupyterServiceManager();
  const jupyter = useJupyter({
    jupyterServerUrl: baseUrl,
    jupyterServerToken: token,
    collaborative: false,
    startDefaultKernel: false,
    defaultKernelName: "python3",
    ...(serviceManager ? { serviceManager } : {}),
    ...props,
  });

  /**
   * Default `kernelIsLoading` in `@datalayer/jupyter-react`’s store is `true` and is only
   * cleared when `startDefaultKernel` starts a kernel. With `startDefaultKernel: false`, the
   * embedded `<Notebook>` owns the kernel — without this, `kernelIsLoading` stays `true` forever.
   */
  useEffect(() => {
    if (props?.startDefaultKernel) {
      return;
    }
    jupyterReactStore.setState({ kernelIsLoading: false });
  }, [props?.startDefaultKernel]);

  return jupyter;
}
