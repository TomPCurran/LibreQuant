import { NextResponse, type NextRequest } from "next/server";

import {
  isUnreachableFetchError,
  mlflowProxyForbiddenIfRequired,
  mlflowUnreachableResponse,
  mlflowUpstreamJsonError,
} from "@/lib/mlflow-http";
import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";
import type {
  MlflowExperimentsSearchResponse,
  MlflowExperimentsSearchRestResponse,
} from "@/lib/types/mlflow";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = mlflowProxyForbiddenIfRequired(request);
  if (denied) return denied;

  const base = getMlflowServerBaseUrl();
  try {
    const res = await fetchMlflow(`${base}/api/2.0/mlflow/experiments/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_results: 500 }),
    });
    if (!res.ok) {
      return mlflowUpstreamJsonError(res);
    }
    const data = (await res.json()) as MlflowExperimentsSearchRestResponse;
    const raw = data.experiments ?? [];
    const body: MlflowExperimentsSearchResponse = {
      experiments: raw.map((e) => ({
        experimentId: e.experiment_id,
        name: e.name,
      })),
    };
    return NextResponse.json(body);
  } catch (e) {
    if (isUnreachableFetchError(e)) {
      return mlflowUnreachableResponse();
    }
    return NextResponse.json(
      { error: "Unexpected error", detail: String(e) },
      { status: 500 },
    );
  }
}
