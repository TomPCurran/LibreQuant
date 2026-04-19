"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ManagedSecretKey } from "@/lib/data-sources/custom-env-key";

/** Presence flags for managed provider keys (same shape as `/api/data-sources/status`). */
export type CredentialsPresence = Record<ManagedSecretKey, boolean>;

export type DataSourcesStatusSnapshot = {
  credentialsPresent: CredentialsPresence;
  customEnvKeys: string[];
  envLocalFileExists: boolean;
};

type DataSourcesStatusContextValue = {
  snapshot: DataSourcesStatusSnapshot;
  /** Refetches status from the server and updates shared snapshot. Does not dispatch window events. */
  refresh: () => Promise<void>;
};

const DataSourcesStatusContext =
  createContext<DataSourcesStatusContextValue | null>(null);

/**
 * Shared credential status for the Data sources route: one snapshot for the main panel and
 * the sidebar ingestors block (avoids duplicate GET `/api/data-sources/status` on load).
 */
export function DataSourcesStatusProvider({
  initial,
  children,
}: {
  initial: DataSourcesStatusSnapshot;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/data-sources/status", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as DataSourcesStatusSnapshot;
    setSnapshot({
      credentialsPresent: data.credentialsPresent,
      customEnvKeys: data.customEnvKeys,
      envLocalFileExists: data.envLocalFileExists,
    });
  }, []);

  const value = useMemo(
    () => ({ snapshot, refresh }),
    [snapshot, refresh],
  );

  return (
    <DataSourcesStatusContext.Provider value={value}>
      {children}
    </DataSourcesStatusContext.Provider>
  );
}

/** Returns shared status on the Data sources route; `null` on other routes. */
export function useDataSourcesStatusOptional(): DataSourcesStatusContextValue | null {
  return useContext(DataSourcesStatusContext);
}
