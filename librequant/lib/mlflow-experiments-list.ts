"use client";

import { useEffect, useState } from "react";

import type { MlflowExperimentSummary } from "@/lib/types/mlflow";

type CacheState = {
  experiments: MlflowExperimentSummary[];
  error: string | null;
};

let inflight: Promise<CacheState> | null = null;
let cached: CacheState | null = null;

async function fetchExperimentsList(): Promise<CacheState> {
  const res = await fetch("/api/mlflow/experiments");
  const data = (await res.json()) as {
    experiments?: MlflowExperimentSummary[];
    error?: string;
  };
  if (!res.ok) {
    return {
      experiments: [],
      error: data.error ?? "Could not load experiments",
    };
  }
  return { experiments: data.experiments ?? [], error: null };
}

/** Deduplicates concurrent and subsequent in-session reads (sidebar + explorer on `/experiments`). */
export function getMlflowExperimentsListCached(): Promise<CacheState> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetchExperimentsList().then((r) => {
    cached = r;
    inflight = null;
    return r;
  });
  return inflight;
}

export function useMlflowExperimentsList(): {
  experiments: MlflowExperimentSummary[];
  listError: string | null;
  loadingExperiments: boolean;
} {
  const [state, setState] = useState<{
    experiments: MlflowExperimentSummary[];
    listError: string | null;
    loadingExperiments: boolean;
  }>(() =>
    cached
      ? {
          experiments: cached.experiments,
          listError: cached.error,
          loadingExperiments: false,
        }
      : {
          experiments: [],
          listError: null,
          loadingExperiments: true,
        },
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setState((s) => ({ ...s, loadingExperiments: true }));
      const result = await getMlflowExperimentsListCached();
      if (!cancelled) {
        setState({
          experiments: result.experiments,
          listError: result.error,
          loadingExperiments: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
