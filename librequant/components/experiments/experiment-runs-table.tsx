"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

import type { MlflowRun } from "@/lib/types/mlflow";
import type { ExperimentSortColumn } from "@/lib/stores/experiment-explorer-store";

import { ExperimentRunDetail } from "./experiment-run-detail";
import { formatMetric, formatTs } from "./use-experiment-explorer";

function SortHead({
  column,
  label,
  sortColumn,
  sortDir,
  onSort,
}: {
  column: ExperimentSortColumn;
  label: string;
  sortColumn: ExperimentSortColumn;
  sortDir: "asc" | "desc";
  onSort: (column: ExperimentSortColumn) => void;
}) {
  return (
    <th scope="col" className="px-2 py-2 text-left">
      <button
        type="button"
        onClick={() => onSort(column)}
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
            <ExperimentRunDetail
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

export function ExperimentRunsTable({
  sortedRuns,
  sortColumn,
  sortDir,
  onSort,
  expandedRunId,
  selectedRunIds,
  onToggleExpand,
  onToggleSelect,
  equityByRun,
  equityLoading,
  equityError,
  onTagOos,
  taggingId,
}: {
  sortedRuns: MlflowRun[];
  sortColumn: ExperimentSortColumn;
  sortDir: "asc" | "desc";
  onSort: (column: ExperimentSortColumn) => void;
  expandedRunId: string | null;
  selectedRunIds: string[];
  onToggleExpand: (runId: string, currentlyOpen: boolean) => void;
  onToggleSelect: (runId: string) => void;
  equityByRun: Record<string, string | null>;
  equityLoading: Record<string, boolean>;
  equityError: Record<string, string | null>;
  onTagOos: (runId: string) => void;
  taggingId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-foreground/10">
      <table className="w-full min-w-[720px] border-separate border-spacing-y-1">
        <thead>
          <tr className="text-left">
            <th className="w-8 px-1 py-2" aria-label="Select for diff" />
            <SortHead
              column="startTime"
              label="Time"
              sortColumn={sortColumn}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHead
              column="symbol"
              label="Symbol"
              sortColumn={sortColumn}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHead
              column="dateRange"
              label="Range"
              sortColumn={sortColumn}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHead
              column="sharpe"
              label="Sharpe"
              sortColumn={sortColumn}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHead
              column="maxDrawdown"
              label="Max DD"
              sortColumn={sortColumn}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHead
              column="cagr"
              label="CAGR"
              sortColumn={sortColumn}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHead
              column="status"
              label="Status"
              sortColumn={sortColumn}
              sortDir={sortDir}
              onSort={onSort}
            />
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
                onToggleExpand={() => onToggleExpand(run.runId, open)}
                onToggleSelect={() => onToggleSelect(run.runId)}
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
  );
}
