"use client";

import { ServerConnection, ServiceManager } from "@jupyterlab/services";
import { useEffect, useMemo } from "react";
import { getPublicJupyterConfig } from "@/lib/env";

/**
 * Lightweight Jupyter `ServiceManager` (no kernel) for Contents API calls on non-workbench routes.
 */
export function useJupyterServiceManager(): {
  serviceManager: ServiceManager.IManager | null;
  error: string | null;
} {
  const { baseUrl, token } = getPublicJupyterConfig();

  const serviceManager = useMemo(() => {
    if (!token) return null;
    const serverSettings = ServerConnection.makeSettings({
      baseUrl,
      token,
      appendToken: true,
    });
    return new ServiceManager({ serverSettings });
  }, [baseUrl, token]);

  useEffect(() => {
    return () => {
      serviceManager?.dispose();
    };
  }, [serviceManager]);

  const error = !token ? "Jupyter token is not configured." : null;
  return { serviceManager, error };
}
