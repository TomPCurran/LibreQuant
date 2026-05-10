import { NextResponse, type NextRequest } from "next/server";
import { flattenError, z } from "zod";

import { mlflowUpstreamJsonError } from "@/lib/mlflow-http";
import { withMlflowProxy } from "@/lib/mlflow-route-handler";
import { fetchMlflow } from "@/lib/mlflow-server";

export const runtime = "nodejs";

/** MLflow tag keys: alphanumeric, underscore, period, hyphen, slash (MLflow REST convention). */
const mlflowTagKey = z
  .string()
  .min(1)
  .max(250)
  .regex(/^[a-zA-Z0-9_.\-/]+$/, {
    message:
      "Tag keys must be 1–250 characters and use only letters, digits, _, ., -, or /",
  });

const patchBodySchema = z
  .object({
    tags: z.record(mlflowTagKey, z.string().max(5000)),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  if (!runId) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: flattenError(parsed.error),
      },
      { status: 400 },
    );
  }

  const tagArray = Object.entries(parsed.data.tags).map(([key, value]) => ({
    key,
    value,
  }));

  return withMlflowProxy(request, async (base) => {
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
  });
}
