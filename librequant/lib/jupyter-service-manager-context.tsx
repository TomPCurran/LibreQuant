"use client";

import { ServerConnection, ServiceManager } from "@jupyterlab/services";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { getPublicJupyterConfig } from "@/lib/env";

type ServiceManagerContextValue = {
  serviceManager: ServiceManager.IManager | null;
  error: string | null;
};

const ServiceManagerContext = createContext<ServiceManagerContextValue>({
  serviceManager: null,
  error: "JupyterServiceManagerProvider not found in component tree.",
});

/**
 * Provides a **single** Jupyter `ServiceManager` to the entire subtree.
 *
 * Before this refactor every call-site of `useJupyterServiceManager()` created
 * its own instance, opening N parallel connections when N components mounted.
 * With the provider at the shell level the manager is created once and shared.
 *
 * @param children - React subtree that may call {@link useJupyterServiceManager}.
 */
export function JupyterServiceManagerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { baseUrl, token } = getPublicJupyterConfig();

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
      const mgr = serviceManager;
      queueMicrotask(() => {
        if (!mountedRef.current) {
          mgr?.dispose();
        }
      });
    };
  }, [serviceManager]);

  useEffect(() => {
    if (!serviceManager) return;
    let cancelled = false;
    const mode =
      process.env.NODE_ENV === "production" ? "production" : "development";
    void serviceManager.ready
      .then(() => {
        if (cancelled) return;
        console.info(
          `[librequant] Jupyter server connected [${mode}] ${baseUrl}`,
        );
      })
      .catch(() => {
        /* Unreachable or auth failure — banner / reachability probe surface UX */
      });
    return () => {
      cancelled = true;
    };
  }, [serviceManager, baseUrl]);

  const error = !token ? "Jupyter token is not configured." : null;

  const value = useMemo<ServiceManagerContextValue>(
    () => ({ serviceManager, error }),
    [serviceManager, error],
  );

  return (
    <ServiceManagerContext.Provider value={value}>
      {children}
    </ServiceManagerContext.Provider>
  );
}

/**
 * Read the singleton `ServiceManager` from context.
 *
 * Must be called inside a `<JupyterServiceManagerProvider>`.
 *
 * @returns Current manager and optional error string (e.g. missing token).
 */
export function useJupyterServiceManager(): ServiceManagerContextValue {
  return useContext(ServiceManagerContext);
}
