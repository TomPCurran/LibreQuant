"use client";

import { useEffect, useState } from "react";

import { formatMlflowApiError } from "@/lib/mlflow-client-error";
import type { MlflowExperimentSummary } from "@/lib/types/mlflow";

type CacheState = {
  experiments: MlflowExperimentSummary[];
  error: string | null;
};

/**
 * Poll while at least one component needs the list (sidebar + explorer may both mount).
 * Default 12s; override with `NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS` (see `.env.example`).
 */
const POLL_INTERVAL_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS?.trim();
  if (!raw) return 12_000;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1000) return 12_000;
  return n;
})();

/**
 * Module-level cache for the experiments list (shared across hook subscribers).
 * Fast Refresh can remount components while leaving store / hasCompletedInitialFetch stale; rare in dev.
 */
let store: {
  experiments: MlflowExperimentSummary[];
  listError: string | null;
  loadingExperiments: boolean;
} = {
  experiments: [],
  listError: null,
  loadingExperiments: true,
};

let hasCompletedInitialFetch = false;
let inflight: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHooked = false;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function stopPollInterval() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function ensurePollInterval() {
  if (pollTimer !== null) return;
  if (listeners.size === 0) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }
  pollTimer = setInterval(() => {
    void refreshExperimentsList();
  }, POLL_INTERVAL_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopPollInterval();
      if (visibilityHooked) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        visibilityHooked = false;
      }
    }
  };
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    stopPollInterval();
    return;
  }
  void refreshExperimentsList();
  ensurePollInterval();
}

function ensurePollingStarted() {
  if (!visibilityHooked) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    visibilityHooked = true;
  }
  ensurePollInterval();
}

async function fetchExperimentsList(): Promise<CacheState> {
  const res = await fetch("/api/mlflow/experiments");
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      experiments: [],
      error: "Could not load experiments",
    };
  }
  if (!res.ok) {
    return {
      experiments: [],
      error: formatMlflowApiError(data, "Could not load experiments"),
    };
  }
  const parsed = data as { experiments?: MlflowExperimentSummary[] };
  return { experiments: parsed.experiments ?? [], error: null };
}

/**
 * Refreshes from MLflow. Concurrent callers share one in-flight request.
 * After the first load, updates are silent (no loading spinner) so new experiments
 * appear without flashing the UI.
 */
export async function refreshExperimentsList(): Promise<void> {
  if (inflight) return inflight;

  inflight = (async () => {
    const isFirstLoad = !hasCompletedInitialFetch;
    if (isFirstLoad) {
      store = { ...store, loadingExperiments: true };
      notify();
    }

    const result = await fetchExperimentsList();
    hasCompletedInitialFetch = true;
    store = {
      experiments: result.experiments,
      listError: result.error,
      loadingExperiments: false,
    };
    notify();
  })();

  try {
    await inflight;
  } finally {
    inflight = null;
  }
}

function getSnapshot() {
  return store;
}

export function useMlflowExperimentsList(): {
  experiments: MlflowExperimentSummary[];
  listError: string | null;
  loadingExperiments: boolean;
} {
  /**
   * Lazy state initializer: `useState(() => getSnapshot())` passes a function so React runs it
   * once on mount and stores the returned snapshot object. Do not write `useState(getSnapshot)` —
   * that would store the function itself as state. Subscribers call `setState(getSnapshot())` to
   * replace state with a fresh snapshot from the module store when the store updates.
   */
  const [state, setState] = useState(() => getSnapshot());

  useEffect(() => {
    const listener = () => setState(getSnapshot());
    const unsubscribe = subscribe(listener);
    ensurePollingStarted();
    void refreshExperimentsList();
    return unsubscribe;
  }, []);

  return state;
}
