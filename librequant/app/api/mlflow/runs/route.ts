import { NextResponse, type NextRequest } from "next/server";

import {
  isUnreachableFetchError,
  mlflowProxyForbiddenIfRequired,
  mlflowUnreachableResponse,
  mlflowUpstreamJsonError,
} from "@/lib/mlflow-http";
import { mapRestRunToMlflowRun } from "@/lib/mlflow-map-run";
import { fetchMlflow, getMlflowServerBaseUrl } from "@/lib/mlflow-server";
import type {
  MlflowExperimentDetail,
  MlflowRestRun,
  MlflowRunsSearchResponse,
  MlflowRunsSearchRestResponse,
} from "@/lib/types/mlflow";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = mlflowProxyForbiddenIfRequired(request);
  if (denied) return denied;

  const experimentName = request.nextUrl.searchParams
    .get("experiment_name")
    ?.trim();
  if (!experimentName) {
    return NextResponse.json(
      { error: "Missing required query param: experiment_name" },
      { status: 400 },
    );
  }
  const filterString =
    request.nextUrl.searchParams.get("filter_string")?.trim() ?? "";
  const maxRaw = request.nextUrl.searchParams.get("max_results");
  const maxResults = maxRaw
    ? Math.min(500, Math.max(1, Number.parseInt(maxRaw, 10) || 50))
    : 50;

  const base = getMlflowServerBaseUrl();

  try {
    const expUrl = new URL(`${base}/api/2.0/mlflow/experiments/get-by-name`);
    expUrl.searchParams.set("experiment_name", experimentName);
    const expRes = await fetchMlflow(expUrl);

    if (expRes.status === 404) {
      const empty: MlflowRunsSearchResponse = { runs: [] };
      return NextResponse.json(empty);
    }
    if (!expRes.ok) {
      return mlflowUpstreamJsonError(expRes);
    }

    const expJson = (await expRes.json()) as MlflowExperimentDetail;
    const experimentId = expJson.experiment.experiment_id;

    const searchRes = await fetchMlflow(`${base}/api/2.0/mlflow/runs/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experiment_ids: [experimentId],
        filter: filterString,
        run_view_type: "ACTIVE_ONLY",
        max_results: maxResults,
      }),
    });

    if (!searchRes.ok) {
      return mlflowUpstreamJsonError(searchRes);
    }

    const searchJson = (await searchRes.json()) as MlflowRunsSearchRestResponse;
    const runsRaw: MlflowRestRun[] = searchJson.runs ?? [];
    const runs = runsRaw.map((r) => mapRestRunToMlflowRun(r, experimentName));
    const body: MlflowRunsSearchResponse = { runs };
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
