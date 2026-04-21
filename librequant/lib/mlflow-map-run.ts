import type { MlflowRestRun, MlflowRun } from "@/lib/types/mlflow";

const METRIC_KEYS = ["sharpe", "max_drawdown", "cagr", "win_rate"] as const;

function listToParamRecord(
  rows: { key: string; value: string }[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!rows) return out;
  for (const row of rows) {
    out[row.key] = row.value;
  }
  return out;
}

function listToTagRecord(
  rows: { key: string; value: string }[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!rows) return out;
  for (const row of rows) {
    out[row.key] = row.value;
  }
  return out;
}

function listToMetricRecord(
  rows: { key: string; value: number }[] | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!rows) return out;
  for (const row of rows) {
    out[row.key] = row.value;
  }
  return out;
}

function pickMetric(
  metrics: Record<string, number>,
  key: (typeof METRIC_KEYS)[number],
): number | null {
  const v = metrics[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Maps an MLflow REST `Run` plus strategy (experiment) name into the UI row type.
 */
export function mapRestRunToMlflowRun(
  run: MlflowRestRun,
  strategy: string,
): MlflowRun {
  const params = listToParamRecord(run.data.params);
  const tags = listToTagRecord(run.data.tags);
  const metrics = listToMetricRecord(run.data.metrics);
  return {
    runId: run.info.run_id,
    strategy,
    symbol: params.symbol ?? "",
    startDate: params.start_date ?? "",
    endDate: params.end_date ?? "",
    sharpe: pickMetric(metrics, "sharpe"),
    maxDrawdown: pickMetric(metrics, "max_drawdown"),
    cagr: pickMetric(metrics, "cagr"),
    winRate: pickMetric(metrics, "win_rate"),
    status: run.info.status,
    startTime: run.info.start_time,
    params,
    tags,
  };
}
