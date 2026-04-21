"use client";

import { ChevronDown, ChevronRight, FlaskConical, Loader2, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { experimentsPageHref } from "@/lib/experiments/experiments-url";
import { useExperimentQuerySync } from "@/lib/experiments/use-experiment-query-sync";
import { formatMlflowApiError } from "@/lib/mlflow-client-error";
import { useMlflowExperimentsList } from "@/lib/mlflow-experiments-list";
import type { MlflowRun } from "@/lib/types/mlflow";
import {
  useExperimentExplorerStore,
  type ExperimentSortColumn,
} from "@/lib/stores/experiment-explorer-store";

const OOS_TAG_KEY = "oos_candidate";

function formatTs(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(ms);
  }
}

function formatMetric(v: number | null): string {
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

function ParamsDiff({
  a,
  b,
}: {
  a: MlflowRun | undefined;
  b: MlflowRun | undefined;
}) {
  if (!a || !b) return null;
  const keys = Array.from(
    new Set([...Object.keys(a.params), ...Object.keys(b.params)]),
  ).sort((x, y) => x.localeCompare(y));
  return (
    <div className="rounded-lg border border-foreground/10 bg-foreground/2 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
        PARAMS diff
      </p>
      <ul className="space-y-1.5 text-xs">
        {keys.map((key) => {
          const va = a.params[key] ?? "";
          const vb = b.params[key] ?? "";
          const diff = va !== vb;
          return (
            <li
              key={key}
              className="grid grid-cols-[1fr_1fr_1fr] gap-2 font-mono-code"
            >
              <span className="text-text-secondary">{key}</span>
              <span
                className={
                  diff
                    ? "rounded bg-alpha/15 px-1 text-text-primary"
                    : "text-text-primary"
                }
              >
                {va || "—"}
              </span>
              <span
                className={
                  diff
                    ? "rounded bg-alpha/15 px-1 text-text-primary"
                    : "text-text-primary"
                }
              >
                {vb || "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RunDetail({
  run,
  equityText,
  equityLoading,
  equityError,
  onTagOos,
  tagging,
}: {
  run: MlflowRun;
  equityText: string | null;
  equityLoading: boolean;
  equityError: string | null;
  onTagOos: () => void;
  tagging: boolean;
}) {
  const entries = Object.entries(run.params).sort(([a], [b]) => a.localeCompare(b));
  const tagEntries = Object.entries(run.tags).sort(([a], [b]) => a.localeCompare(b));
  const oos = run.tags[OOS_TAG_KEY] === "true";

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-foreground/10 bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-primary">Run detail</p>
        <button
          type="button"
          disabled={tagging || oos}
          onClick={onTagOos}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1.5 text-[11px] font-medium text-text-primary transition hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {tagging ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Tag className="size-3.5" aria-hidden />
          )}
          {oos ? "Tagged OOS" : "Tag as OOS candidate"}
        </button>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Params
        </p>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {entries.length === 0 ? (
            <p className="text-xs text-text-secondary">No params</p>
          ) : (
            entries.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <dt className="shrink-0 text-text-secondary">{k}</dt>
                <dd className="min-w-0 break-all font-mono-code text-text-primary">
                  {v}
                </dd>
              </div>
            ))
          )}
        </dl>
      </div>

      {tagEntries.length > 0 ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Tags
          </p>
          <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {tagEntries.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-text-secondary">{k}</dt>
                <dd className="font-mono-code text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Equity curve artifact
        </p>
        {equityLoading ? (
          <p className="flex items-center gap-2 text-xs text-text-secondary">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading…
          </p>
        ) : equityError ? (
          <p className="text-xs text-text-secondary">{equityError}</p>
        ) : equityText ? (
          <pre className="max-h-48 overflow-auto rounded-md border border-foreground/10 bg-foreground/3 p-2 text-[11px] leading-relaxed text-text-primary">
            {equityText.slice(0, 12_000)}
            {equityText.length > 12_000 ? "\n…" : ""}
          </pre>
        ) : (
          <p className="text-xs text-text-secondary">
            No equity CSV found (expected{" "}
            <code className="rounded bg-foreground/10 px-1">curves/equity_curve.csv</code>).
          </p>
        )}
      </div>
    </div>
  );
}

export function ExperimentExplorer() {
  const router = useRouter();
  const {
    experiments,
    listError: experimentsListError,
    loadingExperiments,
  } = useMlflowExperimentsList();
  useExperimentQuerySync(experiments, !loadingExperiments);

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

  const onTagOos = async (runId: string) => {
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
  };

  const SortHead = ({
    column,
    label,
  }: {
    column: ExperimentSortColumn;
    label: string;
  }) => (
    <th scope="col" className="px-2 py-2 text-left">
      <button
        type="button"
        onClick={() => setSort(column)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary transition hover:text-text-primary"
      >
        {label}
        {sortColumn === column ? (
          <span className="text-alpha" aria-hidden>
            {sortDir === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </th>
  );

  return (
    <div className="flex min-h-[min(72vh,840px)] flex-col gap-4 lg:flex-row">
      <div className="w-full shrink-0 lg:w-56">
        <div className="mb-2 flex items-center gap-2 text-text-primary">
          <FlaskConical className="size-4 text-alpha" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">
            Experiments
          </span>
        </div>
        {loadingExperiments ? (
          <div className="flex items-center gap-2 py-4 text-xs text-text-secondary">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : (
          <ul className="max-h-[50vh] space-y-0.5 overflow-y-auto rounded-lg border border-foreground/10 p-1">
            {experiments.map((e) => {
              const active = selectedExperimentName === e.name;
              return (
                <li key={e.experimentId}>
                  <button
                    type="button"
                    onClick={() =>
                      router.replace(experimentsPageHref(e.name), {
                        scroll: false,
                      })
                    }
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                      active
                        ? "bg-alpha/15 font-medium text-alpha"
                        : "text-text-secondary hover:bg-foreground/5 hover:text-text-primary"
                    }`}
                  >
                    {e.name}
                  </button>
                </li>
              );
            })}
            {experiments.length === 0 ? (
              <li className="px-2 py-3 text-xs text-text-secondary">
                No experiments yet — run a notebook with{" "}
                <code className="rounded bg-foreground/10 px-1">backtest_run</code>.
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {experimentsListError || listError ? (
          <p className="mb-3 rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm text-text-secondary">
            {experimentsListError ?? listError}
          </p>
        ) : null}

        {selectedPair ? <ParamsDiff a={selectedPair.a} b={selectedPair.b} /> : null}

        {!selectedExperimentName ? (
          <p className="text-sm text-text-secondary">
            Select an experiment to view runs.
          </p>
        ) : loadingRuns ? (
          <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading runs…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-foreground/10">
            <table className="w-full min-w-[720px] border-separate border-spacing-y-1">
              <thead>
                <tr className="text-left">
                  <th className="w-8 px-1 py-2" aria-label="Select for diff" />
                  <SortHead column="startTime" label="Time" />
                  <SortHead column="symbol" label="Symbol" />
                  <SortHead column="dateRange" label="Range" />
                  <SortHead column="sharpe" label="Sharpe" />
                  <SortHead column="maxDrawdown" label="Max DD" />
                  <SortHead column="cagr" label="CAGR" />
                  <SortHead column="status" label="Status" />
                  <th className="px-1 py-2" aria-label="Expand" />
                </tr>
              </thead>
              <tbody>
                {sortedRuns.map((run) => {
                  const open = expandedRunId === run.runId;
                  const selected = selectedRunIds.includes(run.runId);
                  return (
                    <FragmentRow
                      key={run.runId}
                      run={run}
                      open={open}
                      selected={selected}
                      onToggleExpand={() =>
                        setExpandedRunId(open ? null : run.runId)
                      }
                      onToggleSelect={() => toggleRunSelection(run.runId)}
                      equityText={equityByRun[run.runId] ?? null}
                      equityLoading={Boolean(equityLoading[run.runId])}
                      equityError={equityError[run.runId] ?? null}
                      onTagOos={() => void onTagOos(run.runId)}
                      tagging={taggingId === run.runId}
                    />
                  );
                })}
              </tbody>
            </table>
            {sortedRuns.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-secondary">
                No runs in this experiment.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  run,
  open,
  selected,
  onToggleExpand,
  onToggleSelect,
  equityText,
  equityLoading,
  equityError,
  onTagOos,
  tagging,
}: {
  run: MlflowRun;
  open: boolean;
  selected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  equityText: string | null;
  equityLoading: boolean;
  equityError: string | null;
  onTagOos: () => void;
  tagging: boolean;
}) {
  return (
    <>
      <tr
        className={`rounded-md align-middle ${
          selected ? "bg-alpha/10" : "hover:bg-foreground/3"
        }`}
      >
        <td className="px-1 py-1.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select run ${run.runId} for diff`}
            className="accent-alpha"
          />
        </td>
        <td className="px-2 py-1.5 text-xs text-text-primary">
          {formatTs(run.startTime)}
        </td>
        <td className="px-2 py-1.5 font-mono-code text-xs text-text-primary">
          {run.symbol || "—"}
        </td>
        <td className="px-2 py-1.5 text-xs text-text-secondary">
          {run.startDate && run.endDate
            ? `${run.startDate} → ${run.endDate}`
            : "—"}
        </td>
        <td className="px-2 py-1.5 text-xs tabular-nums text-text-primary">
          {formatMetric(run.sharpe)}
        </td>
        <td className="px-2 py-1.5 text-xs tabular-nums text-text-primary">
          {formatMetric(run.maxDrawdown)}
        </td>
        <td className="px-2 py-1.5 text-xs tabular-nums text-text-primary">
          {formatMetric(run.cagr)}
        </td>
        <td className="px-2 py-1.5 text-xs text-text-secondary">{run.status}</td>
        <td className="px-1 py-1.5">
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded p-1 text-text-secondary hover:bg-foreground/10 hover:text-text-primary"
            aria-expanded={open}
            aria-label={open ? "Collapse run" : "Expand run"}
          >
            {open ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-transparent">
          <td colSpan={9} className="px-0 pb-3">
            <RunDetail
              run={run}
              equityText={equityText}
              equityLoading={equityLoading}
              equityError={equityError}
              onTagOos={onTagOos}
              tagging={tagging}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}
