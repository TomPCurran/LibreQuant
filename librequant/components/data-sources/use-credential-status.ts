"use client";

import { useDataSourcesStatusOptional } from "@/lib/data-sources-status-context";

/**
 * Credential snapshot + refresh for the Data sources route.
 * Throws if used outside `DataSourcesStatusProvider` (same contract as the panel).
 */
export function useCredentialStatus() {
  const ctx = useDataSourcesStatusOptional();
  if (!ctx) {
    throw new Error(
      "DataSourcesPanel must be rendered inside DataSourcesStatusProvider",
    );
  }
  return ctx;
}
