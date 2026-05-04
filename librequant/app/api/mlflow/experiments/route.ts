import { NextResponse, type NextRequest } from "next/server";

import { mlflowUpstreamJsonError } from "@/lib/mlflow-http";
import { withMlflowProxy } from "@/lib/mlflow-route-handler";
import { fetchMlflow } from "@/lib/mlflow-server";
import type {
  MlflowExperimentsSearchResponse,
  MlflowExperimentsSearchRestResponse,
} from "@/lib/types/mlflow";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withMlflowProxy(request, async (base) => {
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
  });
}
