/**
 * Server-only MLflow Tracking URL resolution for Next.js route handlers.
 *
 * **Docker:** Jupyter uses `http://mlflow:5000` inside the compose network. The Next.js dev
 * server runs on the host, so it must reach MLflow at loopback (e.g. `http://127.0.0.1:5000`).
 * Set `MLFLOW_TRACKING_URI` in `librequant/.env.local` to match where the API can reach MLflow.
 *
 * @module mlflow-server
 */

/**
 * Base URL for MLflow REST API (no trailing slash), for server-side `fetch` only.
 */
export function getMlflowServerBaseUrl(): string {
  const fromTracking = process.env.MLFLOW_TRACKING_URI?.trim().replace(/\/$/, "");
  const fromApi = process.env.MLFLOW_API_BASE_URL?.trim().replace(/\/$/, "");
  return fromTracking ?? fromApi ?? "http://127.0.0.1:5000";
}

const MLFLOW_FETCH_TIMEOUT_MS = 15_000;

/**
 * Performs a `fetch` to MLflow with a timeout; used so route handlers fail fast when MLflow is down.
 */
export async function fetchMlflow(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), MLFLOW_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}
