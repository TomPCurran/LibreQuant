import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** User-facing message when MLflow cannot be reached (timeout, network, DNS). */
export const MLFLOW_UNREACHABLE =
  "MLflow server unreachable. Start Docker Compose (mlflow service on 127.0.0.1:5000) or set MLFLOW_TRACKING_URI in .env.local.";

const DETAIL_MAX = 2000;

export function mlflowUnreachableResponse(): NextResponse {
  return NextResponse.json({ error: MLFLOW_UNREACHABLE }, { status: 503 });
}

/** True for typical fetch failures when MLflow is down or the request was aborted (timeout). */
export function isUnreachableFetchError(cause: unknown): boolean {
  if (cause instanceof TypeError) return true;
  if (cause instanceof DOMException && cause.name === "AbortError") return true;
  return false;
}

/**
 * JSON body for a failed MLflow response: includes `upstreamStatus` and truncated `detail`.
 * HTTP status: mirror MLflow 4xx; use 502 when MLflow returns 5xx (bad gateway).
 */
export async function mlflowUpstreamJsonError(res: Response): Promise<NextResponse> {
  const text = await res.text();
  const detail = text.slice(0, DETAIL_MAX);
  const upstream = res.status;
  const httpStatus = upstream >= 500 ? 502 : upstream;
  return NextResponse.json(
    {
      error: "MLflow request failed",
      upstreamStatus: upstream,
      ...(detail ? { detail } : {}),
    },
    { status: httpStatus },
  );
}

/**
 * When `MLFLOW_PROXY_REQUIRE_LOOPBACK=1`, reject requests whose first forwarded client
 * address is not loopback. If no `X-Forwarded-For` / `X-Real-IP` is present, allow (direct
 * connections typical in local dev). See SECURITY.md.
 */
export function mlflowProxyForbiddenIfRequired(
  request: NextRequest,
): NextResponse | null {
  if (process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK !== "1") return null;
  const xff = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const candidate = xff?.split(",")[0]?.trim() || realIp?.trim();
  if (!candidate) return null;
  if (isLoopbackAddress(candidate)) return null;
  return NextResponse.json(
    {
      error:
        "MLflow API proxy denied: MLFLOW_PROXY_REQUIRE_LOOPBACK=1 and client is not loopback.",
    },
    { status: 403 },
  );
}

function isLoopbackAddress(ip: string): boolean {
  const s = ip.trim();
  if (s === "::1" || s === "::ffff:127.0.0.1") return true;
  const parts = s.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((p) => Number.parseInt(p, 10));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  return octets[0] === 127;
}
