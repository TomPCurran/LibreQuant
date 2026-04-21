import { NextResponse, type NextRequest } from "next/server";

import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";
import type { MlflowArtifactsListRestResponse } from "@/lib/types/mlflow";

export const runtime = "nodejs";

const MLFLOW_UNREACHABLE =
  "MLflow server unreachable. Start Docker Compose (mlflow service on 127.0.0.1:5000) or set MLFLOW_TRACKING_URI in .env.local.";

/**
 * Proxies MLflow `POST /api/2.0/mlflow/artifacts/list` for a run (optional relative `path`).
 */
export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("run_id")?.trim();
  if (!runId) {
    return NextResponse.json({ error: "Missing query param: run_id" }, { status: 400 });
  }
  const path = request.nextUrl.searchParams.get("path")?.trim() ?? "";

  const base = getMlflowServerBaseUrl();
  try {
    const res = await fetchMlflow(`${base}/api/2.0/mlflow/artifacts/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId, path }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
    }
    const data = (await res.json()) as MlflowArtifactsListRestResponse;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
  }
}
