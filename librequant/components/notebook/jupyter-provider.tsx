"use client";

import "@/lib/ensure-webpack-public-path";
import { useJupyter, type IJupyterProps } from "@datalayer/jupyter-react";
import { getPublicJupyterConfig } from "@/lib/env";

/**
 * Opinionated Jupyter session hook with public env defaults (LibreQuant shell).
 */
export function useLibreJupyterSession(props?: Partial<IJupyterProps>) {
  const { baseUrl, token } = getPublicJupyterConfig();
  return useJupyter({
    jupyterServerUrl: baseUrl,
    jupyterServerToken: token,
    collaborative: false,
    startDefaultKernel: true,
    defaultKernelName: "python3",
    ...props,
  });
}
