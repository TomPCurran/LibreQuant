import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { server } from "@/lib/test/setup";

import { GET } from "./route";

const base = "http://127.0.0.1:5000";

describe("GET /api/mlflow/artifacts/download", () => {
  const prevLoop = process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;

  beforeEach(() => {
    delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
  });

  afterEach(() => {
    if (prevLoop === undefined) delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
    else process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = prevLoop;
  });

  it("returns 400 when run_id or path is missing", async () => {
    const req = new NextRequest(
      "http://localhost/api/mlflow/artifacts/download?run_id=r1",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("proxies bytes and Content-Type from MLflow get-artifact", async () => {
    server.use(
      http.get(`${base}/get-artifact`, ({ request }) => {
        const u = new URL(request.url);
        expect(u.searchParams.get("run_id")).toBe("r1");
        expect(u.searchParams.get("path")).toBe("metrics/plot.csv");
        return new HttpResponse(new Uint8Array([9, 10]), {
          status: 200,
          headers: { "Content-Type": "text/csv" },
        });
      }),
    );
    const qs = new URLSearchParams({
      run_id: "r1",
      path: "metrics/plot.csv",
    });
    const req = new NextRequest(
      `http://localhost/api/mlflow/artifacts/download?${qs.toString()}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv");
    const buf = new Uint8Array(await res.arrayBuffer());
    expect([...buf]).toEqual([9, 10]);
  });

  it("returns 403 when loopback is required and client is not loopback", async () => {
    process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = "1";
    server.use(
      http.get(`${base}/get-artifact`, () => new HttpResponse(null, { status: 200 })),
    );
    const qs = new URLSearchParams({ run_id: "r1", path: "x" });
    const req = new NextRequest(
      `http://localhost/api/mlflow/artifacts/download?${qs.toString()}`,
      { headers: { "x-forwarded-for": "10.0.0.1" } },
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
