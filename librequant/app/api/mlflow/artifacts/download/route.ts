import { NextResponse, type NextRequest } from "next/server";

import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";

export const runtime = "nodejs";

const MLFLOW_UNREACHABLE =
  "MLflow server unreachable. Start Docker Compose (mlflow service on 127.0.0.1:5000) or set MLFLOW_TRACKING_URI in .env.local.";

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

  const base = getMlflowServerBaseUrl();
  const u = new URL(`${base}/get-artifact`);
  u.searchParams.set("run_id", runId);
  u.searchParams.set("path", artifactPath);

  try {
    const res = await fetchMlflow(u);
    if (!res.ok) {
      return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
    }
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
  }
}
