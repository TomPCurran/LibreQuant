"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatMlflowApiError } from "@/lib/mlflow-client-error";
import type { MlflowRun } from "@/lib/types/mlflow";
import {
  useExperimentExplorerStore,
  type ExperimentSortColumn,
} from "@/lib/stores/experiment-explorer-store";

export const OOS_TAG_KEY = "oos_candidate";

export function formatTs(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(ms);
  }
}

export function formatMetric(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  dir: "asc" | "desc",
): number {
  const av = a ?? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  const bv = b ?? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  const c = av - bv;
  return dir === "asc" ? c : -c;
}

function compareStrings(a: string, b: string, dir: "asc" | "desc"): number {
  const c = a.localeCompare(b);
  return dir === "asc" ? c : -c;
}

function sortRuns(
  runs: MlflowRun[],
  column: ExperimentSortColumn,
  dir: "asc" | "desc",
): MlflowRun[] {
  const copy = [...runs];
  copy.sort((x, y) => {
    switch (column) {
      case "startTime":
        return dir === "asc"
          ? x.startTime - y.startTime
          : y.startTime - x.startTime;
      case "symbol":
        return compareStrings(x.symbol, y.symbol, dir);
      case "dateRange": {
        const sx = `${x.startDate}\u0000${x.endDate}`;
        const sy = `${y.startDate}\u0000${y.endDate}`;
        return compareStrings(sx, sy, dir);
      }
      case "sharpe":
        return compareNullableNumber(x.sharpe, y.sharpe, dir);
      case "maxDrawdown":
        return compareNullableNumber(x.maxDrawdown, y.maxDrawdown, dir);
      case "cagr":
        return compareNullableNumber(x.cagr, y.cagr, dir);
      case "status":
        return compareStrings(x.status, y.status, dir);
      default:
        return 0;
    }
  });
  return copy;
}

export function useExperimentExplorer() {
  const [runs, setRuns] = useState<MlflowRun[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);

  const selectedExperimentName = useExperimentExplorerStore(
    (s) => s.selectedExperimentName,
  );
  const selectedRunIds = useExperimentExplorerStore((s) => s.selectedRunIds);
  const toggleRunSelection = useExperimentExplorerStore((s) => s.toggleRunSelection);
  const expandedRunId = useExperimentExplorerStore((s) => s.expandedRunId);
  const setExpandedRunId = useExperimentExplorerStore((s) => s.setExpandedRunId);
  const sortColumn = useExperimentExplorerStore((s) => s.sortColumn);
  const sortDir = useExperimentExplorerStore((s) => s.sortDir);
  const setSort = useExperimentExplorerStore((s) => s.setSort);

  const [equityByRun, setEquityByRun] = useState<Record<string, string | null>>({});
  const [equityLoading, setEquityLoading] = useState<Record<string, boolean>>({});
  const [equityError, setEquityError] = useState<Record<string, string | null>>({});
  const [taggingId, setTaggingId] = useState<string | null>(null);

  const loadRuns = useCallback(async (name: string) => {
    setLoadingRuns(true);
    setListError(null);
    setEquityByRun({});
    setEquityError({});
    setEquityLoading({});
    try {
      const q = new URLSearchParams({ experiment_name: name, max_results: "100" });
      const res = await fetch(`/api/mlflow/runs?${q.toString()}`);
      const data = (await res.json()) as unknown;
      if (!res.ok) {
        setListError(formatMlflowApiError(data, "Failed to load runs"));
        setRuns([]);
        return;
      }
      const body = data as { runs?: MlflowRun[] };
      setRuns(body.runs ?? []);
    } catch {
      setListError("Failed to load runs");
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExperimentName) {
      void loadRuns(selectedExperimentName);
    } else {
      setRuns([]);
    }
  }, [selectedExperimentName, loadRuns]);

  const sortedRuns = useMemo(
    () => sortRuns(runs, sortColumn, sortDir),
    [runs, sortColumn, sortDir],
  );

  const selectedPair = useMemo(() => {
    if (selectedRunIds.length !== 2) return null;
    const [a, b] = selectedRunIds;
    const ra = runs.find((r) => r.runId === a);
    const rb = runs.find((r) => r.runId === b);
    if (!ra || !rb) return null;
    return { a: ra, b: rb };
  }, [selectedRunIds, runs]);

  const fetchEquityPreview = useCallback(async (runId: string) => {
    setEquityLoading((m) => ({ ...m, [runId]: true }));
    setEquityError((m) => ({ ...m, [runId]: null }));
    try {
      const path = "curves/equity_curve.csv";
      const res = await fetch(
        `/api/mlflow/artifacts/download?run_id=${encodeURIComponent(runId)}&path=${encodeURIComponent(path)}`,
      );
      const bodyText = await res.text();
      if (!res.ok) {
        setEquityByRun((m) => ({ ...m, [runId]: null }));
        let msg = "Could not download equity artifact.";
        try {
          const j = JSON.parse(bodyText) as unknown;
          msg = formatMlflowApiError(j, msg);
        } catch {
          const t = bodyText.trim();
          if (t) {
            msg = t.length > 500 ? `${t.slice(0, 500)}…` : t;
          }
        }
        setEquityError((m) => ({ ...m, [runId]: msg }));
        return;
      }
      setEquityByRun((m) => ({ ...m, [runId]: bodyText }));
    } catch {
      setEquityByRun((m) => ({ ...m, [runId]: null }));
      setEquityError((m) => ({
        ...m,
        [runId]: "Could not download equity artifact.",
      }));
    } finally {
      setEquityLoading((m) => ({ ...m, [runId]: false }));
    }
  }, []);

  useEffect(() => {
    if (!expandedRunId) return;
    if (equityByRun[expandedRunId] !== undefined || equityLoading[expandedRunId]) {
      return;
    }
    void fetchEquityPreview(expandedRunId);
  }, [expandedRunId, equityByRun, equityLoading, fetchEquityPreview]);

  const onTagOos = useCallback(async (runId: string) => {
    setTaggingId(runId);
    try {
      const res = await fetch(`/api/mlflow/runs/${encodeURIComponent(runId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: { [OOS_TAG_KEY]: "true" } }),
      });
      if (!res.ok) {
        const j = (await res.json()) as unknown;
        setListError(formatMlflowApiError(j, "Could not update tags"));
        return;
      }
      setRuns((prev) =>
        prev.map((r) =>
          r.runId === runId
            ? {
                ...r,
                tags: { ...r.tags, [OOS_TAG_KEY]: "true" },
              }
            : r,
        ),
      );
    } finally {
      setTaggingId(null);
    }
  }, []);

  return {
    selectedExperimentName,
    listError,
    loadingRuns,
    sortedRuns,
    selectedPair,
    selectedRunIds,
    expandedRunId,
    sortColumn,
    sortDir,
    setSort,
    setExpandedRunId,
    toggleRunSelection,
    equityByRun,
    equityLoading,
    equityError,
    onTagOos,
    taggingId,
  };
}
