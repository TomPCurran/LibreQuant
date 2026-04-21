import { NextResponse, type NextRequest } from "next/server";

import {
  isUnreachableFetchError,
  mlflowProxyForbiddenIfRequired,
  mlflowUnreachableResponse,
  mlflowUpstreamJsonError,
} from "@/lib/mlflow-http";
import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";

export const runtime = "nodejs";

type PatchBody = {
  tags?: Record<string, string>;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  const denied = mlflowProxyForbiddenIfRequired(request);
  if (denied) return denied;

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
    return NextResponse.json(
      { error: "Expected body.tags object" },
      { status: 400 },
    );
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
      return mlflowUpstreamJsonError(res);
    }

    return NextResponse.json({ ok: true });
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
