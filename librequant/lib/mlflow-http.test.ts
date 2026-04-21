import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import {
  isUnreachableFetchError,
  mlflowProxyForbiddenIfRequired,
  mlflowUpstreamJsonError,
} from "@/lib/mlflow-http";

describe("isUnreachableFetchError", () => {
  it("returns true for TypeError", () => {
    expect(isUnreachableFetchError(new TypeError("fetch failed"))).toBe(true);
  });

  it("returns true for AbortError DOMException", () => {
    expect(
      isUnreachableFetchError(new DOMException("Aborted", "AbortError")),
    ).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isUnreachableFetchError(new Error("boom"))).toBe(false);
  });
});

describe("mlflowUpstreamJsonError", () => {
  it("mirrors 4xx from upstream on HTTP response", async () => {
    const res = new Response("not found", { status: 404 });
    const next = await mlflowUpstreamJsonError(res);
    expect(next.status).toBe(404);
    const body = (await next.json()) as {
      error: string;
      upstreamStatus: number;
      detail?: string;
    };
    expect(body.error).toBe("MLflow request failed");
    expect(body.upstreamStatus).toBe(404);
    expect(body.detail).toBe("not found");
  });

  it("maps upstream 5xx to 502", async () => {
    const res = new Response("mlflow down", { status: 503 });
    const next = await mlflowUpstreamJsonError(res);
    expect(next.status).toBe(502);
    const body = (await next.json()) as { upstreamStatus: number };
    expect(body.upstreamStatus).toBe(503);
  });

  it("truncates detail to DETAIL_MAX", async () => {
    const long = "x".repeat(2500);
    const res = new Response(long, { status: 400 });
    const next = await mlflowUpstreamJsonError(res);
    const body = (await next.json()) as { detail?: string };
    expect(body.detail?.length).toBe(2000);
  });
});

describe("mlflowProxyForbiddenIfRequired", () => {
  const prev = process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;

  beforeEach(() => {
    delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
  });

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
    } else {
      process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = prev;
    }
  });

  it("returns null when env is unset", () => {
    const req = new NextRequest("http://localhost/api/mlflow/experiments", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    expect(mlflowProxyForbiddenIfRequired(req)).toBeNull();
  });

  it("returns null when env is set but no forwarded headers", () => {
    process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = "1";
    const req = new NextRequest("http://localhost/api/mlflow/experiments");
    expect(mlflowProxyForbiddenIfRequired(req)).toBeNull();
  });

  it("returns null for loopback X-Forwarded-For", () => {
    process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = "1";
    const req = new NextRequest("http://localhost/api/mlflow/experiments", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    expect(mlflowProxyForbiddenIfRequired(req)).toBeNull();
  });

  it("returns 403 for non-loopback X-Forwarded-For", async () => {
    process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = "1";
    const req = new NextRequest("http://localhost/api/mlflow/experiments", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    const denied = mlflowProxyForbiddenIfRequired(req);
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(403);
    const j = (await denied!.json()) as { error: string };
    expect(j.error).toContain("MLflow API proxy denied");
  });
});
