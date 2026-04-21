/** Max length for `detail` when formatting user-visible MLflow BFF errors. */
const DETAIL_DISPLAY_MAX = 500;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

/**
 * Builds a single line from `/api/mlflow/*` JSON error bodies (`error`, `upstreamStatus`, `detail`).
 */
export function formatMlflowApiError(json: unknown, fallback: string): string {
  if (!isRecord(json)) return fallback;
  const err = typeof json.error === "string" ? json.error : null;
  const detail = typeof json.detail === "string" ? json.detail : null;
  const upstream =
    typeof json.upstreamStatus === "number" ? json.upstreamStatus : null;
  let s = err?.trim() ? err : fallback;
  if (upstream !== null) {
    s += ` (HTTP upstream ${upstream})`;
  }
  if (detail?.trim()) {
    const d =
      detail.length > DETAIL_DISPLAY_MAX
        ? `${detail.slice(0, DETAIL_DISPLAY_MAX)}…`
        : detail;
    s += ` — ${d}`;
  }
  return s;
}
