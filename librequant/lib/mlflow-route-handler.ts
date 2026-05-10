import { NextResponse, type NextRequest } from "next/server";

import {
  isUnreachableFetchError,
  mlflowProxyForbiddenIfRequired,
  mlflowUnreachableResponse,
} from "@/lib/mlflow-http";
import { getMlflowServerBaseUrl } from "@/lib/mlflow-server";

export async function withMlflowProxy(
  request: NextRequest,
  handler: (baseUrl: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  const denied = mlflowProxyForbiddenIfRequired(request);
  if (denied) return denied;

  const baseUrl = getMlflowServerBaseUrl();

  try {
    return await handler(baseUrl);
  } catch (e) {
    if (isUnreachableFetchError(e)) {
      return mlflowUnreachableResponse();
    }
    console.error("[mlflow-proxy]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
