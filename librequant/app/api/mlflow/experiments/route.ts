import { NextResponse } from "next/server";

import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";
import type {
  MlflowExperimentsSearchResponse,
  MlflowExperimentsSearchRestResponse,
} from "@/lib/types/mlflow";

export const runtime = "nodejs";

const MLFLOW_UNREACHABLE =
  "MLflow server unreachable. Start Docker Compose (mlflow service on 127.0.0.1:5000) or set MLFLOW_TRACKING_URI in .env.local.";

export async function GET() {
  const base = getMlflowServerBaseUrl();
  try {
    const res = await fetchMlflow(`${base}/api/2.0/mlflow/experiments/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_results: 500 }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
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
  } catch {
    return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
  }
}
