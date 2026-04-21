import { NextResponse, type NextRequest } from "next/server";

import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";

export const runtime = "nodejs";

const MLFLOW_UNREACHABLE =
  "MLflow server unreachable. Start Docker Compose (mlflow service on 127.0.0.1:5000) or set MLFLOW_TRACKING_URI in .env.local.";

type PatchBody = {
  tags?: Record<string, string>;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  if (!runId) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tags = body.tags;
  if (!tags || typeof tags !== "object") {
    return NextResponse.json({ error: "Expected body.tags object" }, { status: 400 });
  }

  const tagArray = Object.entries(tags).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  const base = getMlflowServerBaseUrl();

  try {
    const res = await fetchMlflow(`${base}/api/2.0/mlflow/runs/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: runId,
        tags: tagArray,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: MLFLOW_UNREACHABLE, detail: text.slice(0, 500) },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
  }
}
