import { NextResponse, type NextRequest } from "next/server";

import {
  isUnreachableFetchError,
  mlflowProxyForbiddenIfRequired,
  mlflowUnreachableResponse,
  mlflowUpstreamJsonError,
} from "@/lib/mlflow-http";
import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";

export const runtime = "nodejs";

/**
 * Proxies MLflow `GET /get-artifact` so the browser can load CSV/text artifacts same-origin.
 */
export async function GET(request: NextRequest) {
  const denied = mlflowProxyForbiddenIfRequired(request);
  if (denied) return denied;

  const runId = request.nextUrl.searchParams.get("run_id")?.trim();
  const artifactPath = request.nextUrl.searchParams.get("path")?.trim();
  if (!runId || artifactPath === undefined || artifactPath === "") {
    return NextResponse.json(
      { error: "Missing query params: run_id and path" },
      { status: 400 },
    );
  }

  const base = getMlflowServerBaseUrl();
  const u = new URL(`${base}/get-artifact`);
  u.searchParams.set("run_id", runId);
  u.searchParams.set("path", artifactPath);

  try {
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
