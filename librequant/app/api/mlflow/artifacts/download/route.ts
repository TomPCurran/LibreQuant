import { NextResponse, type NextRequest } from "next/server";

import { mlflowUpstreamJsonError } from "@/lib/mlflow-http";
import { withMlflowProxy } from "@/lib/mlflow-route-handler";
import { fetchMlflow } from "@/lib/mlflow-server";

export const runtime = "nodejs";

/**
 * Proxies MLflow `GET /get-artifact` so the browser can load CSV/text artifacts same-origin.
 */
export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("run_id")?.trim();
  const artifactPath = request.nextUrl.searchParams.get("path")?.trim();
  if (!runId || artifactPath === undefined || artifactPath === "") {
    return NextResponse.json(
      { error: "Missing query params: run_id and path" },
      { status: 400 },
    );
  }

  return withMlflowProxy(request, async (base) => {
    const u = new URL(`${base}/get-artifact`);
    u.searchParams.set("run_id", runId);
    u.searchParams.set("path", artifactPath);

    const res = await fetchMlflow(u);
    if (!res.ok) {
      return mlflowUpstreamJsonError(res);
    }
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  });
}
