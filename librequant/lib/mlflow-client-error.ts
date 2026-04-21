/** Max length for `detail` when formatting user-visible MLflow BFF errors. */
const DETAIL_DISPLAY_MAX = 500;

/** Same phrase as BFF `mlflowUpstreamJsonError` when upstream returns non-OK. */
const MLFLOW_BFF_GENERIC_ERROR = "MLflow request failed";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function truncateDetail(detail: string): string {
  return detail.length > DETAIL_DISPLAY_MAX
    ? `${detail.slice(0, DETAIL_DISPLAY_MAX)}…`
    : detail;
}

/**
 * Builds a single line from `/api/mlflow/*` JSON error bodies (`error`, `upstreamStatus`, `detail`).
 *
 * When `error` is missing or only the generic BFF phrase but `detail` carries the real message,
 * the formatted string leads with `detail` (and upstream status), not the redundant generic title.
 */
export function formatMlflowApiError(json: unknown, fallback: string): string {
  if (!isRecord(json)) return fallback;
  const err = typeof json.error === "string" ? json.error : null;
  const detail = typeof json.detail === "string" ? json.detail : null;
  const upstream =
    typeof json.upstreamStatus === "number" ? json.upstreamStatus : null;

  const errTrim = err?.trim() ?? "";
  const detailTrim = detail?.trim() ?? "";

  const useGenericOrMissingError =
    errTrim.length === 0 || errTrim === MLFLOW_BFF_GENERIC_ERROR;

  if (detailTrim && useGenericOrMissingError) {
    let s = truncateDetail(detailTrim);
    if (upstream !== null) {
      s += ` (HTTP upstream ${upstream})`;
    }
    return s;
  }

  let s = errTrim ? errTrim : fallback;
  if (upstream !== null) {
    s += ` (HTTP upstream ${upstream})`;
  }
  if (detailTrim) {
    s += ` — ${truncateDetail(detailTrim)}`;
  }
  return s;
}
