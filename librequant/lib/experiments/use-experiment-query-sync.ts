"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { EXPERIMENT_QUERY_KEY, experimentsPageHref } from "@/lib/experiments/experiments-url";
import { useExperimentExplorerStore } from "@/lib/stores/experiment-explorer-store";
import type { MlflowExperimentSummary } from "@/lib/types/mlflow";

/**
 * URL is the source of truth: `?experiment=` drives `selectedExperimentName`.
 * Call from `/experiments` only (wrap in Suspense when using `useSearchParams`).
 */
export function useExperimentQuerySync(
  experiments: MlflowExperimentSummary[],
  experimentsLoaded: boolean,
): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setSelectedExperimentName = useExperimentExplorerStore(
    (s) => s.setSelectedExperimentName,
  );

  useEffect(() => {
    const raw = searchParams.get(EXPERIMENT_QUERY_KEY);
    const decoded =
      raw !== null && raw !== ""
        ? (() => {
            try {
              return decodeURIComponent(raw);
            } catch {
              return raw;
            }
          })()
        : null;
    setSelectedExperimentName(decoded);
  }, [searchParams, setSelectedExperimentName]);

  useEffect(() => {
    if (!experimentsLoaded) return;
    const raw = searchParams.get(EXPERIMENT_QUERY_KEY);
    if (raw === null || raw === "") return;
    let name: string;
    try {
      name = decodeURIComponent(raw);
    } catch {
      name = raw;
    }
    const ok = experiments.some((e) => e.name === name);
    if (!ok) {
      router.replace(experimentsPageHref(null), { scroll: false });
      setSelectedExperimentName(null);
    }
  }, [
    experimentsLoaded,
    experiments,
    searchParams,
    router,
    setSelectedExperimentName,
  ]);
}
