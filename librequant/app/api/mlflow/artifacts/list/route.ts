import { NextResponse, type NextRequest } from "next/server";

import { mlflowUpstreamJsonError } from "@/lib/mlflow-http";
import { withMlflowProxy } from "@/lib/mlflow-route-handler";
import { fetchMlflow } from "@/lib/mlflow-server";
import type { MlflowArtifactsListRestResponse } from "@/lib/types/mlflow";

export const runtime = "nodejs";

/**
 * Proxies MLflow `POST /api/2.0/mlflow/artifacts/list` for a run (optional relative `path`).
 */
export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("run_id")?.trim();
  if (!runId) {
    return NextResponse.json(
      { error: "Missing query param: run_id" },
      { status: 400 },
    );
  }
  const path = request.nextUrl.searchParams.get("path")?.trim() ?? "";

  return withMlflowProxy(request, async (base) => {
    const res = await fetchMlflow(`${base}/api/2.0/mlflow/artifacts/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId, path }),
    });
    if (!res.ok) {
      return mlflowUpstreamJsonError(res);
    }
    const data = (await res.json()) as MlflowArtifactsListRestResponse;
    return NextResponse.json(data);
  });
}
