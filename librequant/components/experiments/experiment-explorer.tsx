"use client";

import { FlaskConical, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { experimentsPageHref } from "@/lib/experiments/experiments-url";
import { useExperimentQuerySync } from "@/lib/experiments/use-experiment-query-sync";
import { useMlflowExperimentsList } from "@/lib/mlflow-experiments-list";
import type { MlflowRun } from "@/lib/types/mlflow";

import { ExperimentRunsTable } from "./experiment-runs-table";
import { useExperimentExplorer } from "./use-experiment-explorer";

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

export function ExperimentExplorer() {
  const router = useRouter();
  const {
    experiments,
    listError: experimentsListError,
    loadingExperiments,
  } = useMlflowExperimentsList();
  useExperimentQuerySync(experiments, !loadingExperiments);

  const {
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
  } = useExperimentExplorer();

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
          <ExperimentRunsTable
            sortedRuns={sortedRuns}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={setSort}
            expandedRunId={expandedRunId}
            selectedRunIds={selectedRunIds}
            onToggleExpand={(runId, open) =>
              setExpandedRunId(open ? null : runId)
            }
            onToggleSelect={toggleRunSelection}
            equityByRun={equityByRun}
            equityLoading={equityLoading}
            equityError={equityError}
            onTagOos={onTagOos}
            taggingId={taggingId}
          />
        )}
      </div>
    </div>
  );
}
