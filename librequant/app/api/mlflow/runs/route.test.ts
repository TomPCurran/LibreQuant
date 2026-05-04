import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { MLFLOW_UNREACHABLE } from "@/lib/mlflow-http";
import { server } from "@/lib/test/setup";

import { GET } from "./route";

const base = "http://127.0.0.1:5000";

describe("GET /api/mlflow/runs", () => {
  const prevLoop = process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;

  beforeEach(() => {
    delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
  });

  afterEach(() => {
    if (prevLoop === undefined) delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
    else process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = prevLoop;
  });

  it("returns 400 when experiment_name is missing", async () => {
    const req = new NextRequest("http://localhost/api/mlflow/runs");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns mapped runs when experiment exists", async () => {
    server.use(
      http.get(`${base}/api/2.0/mlflow/experiments/get-by-name`, () =>
        HttpResponse.json({
          experiment: { experiment_id: "1", name: "Strat" },
        }),
      ),
      http.post(`${base}/api/2.0/mlflow/runs/search`, async () =>
        HttpResponse.json({
          runs: [
            {
              info: {
                run_id: "r1",
                experiment_id: "1",
                status: "FINISHED",
                start_time: 10,
              },
              data: { params: [], metrics: [], tags: [] },
            },
          ],
        }),
      ),
    );

    const req = new NextRequest(
      "http://localhost/api/mlflow/runs?experiment_name=Strat",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runs: { runId: string; strategy: string }[] };
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0]!.runId).toBe("r1");
    expect(body.runs[0]!.strategy).toBe("Strat");
  });

  it("returns empty runs when experiment get-by-name is 404", async () => {
    server.use(
      http.get(`${base}/api/2.0/mlflow/experiments/get-by-name`, () =>
        HttpResponse.json(null, { status: 404 }),
      ),
    );
    const req = new NextRequest(
      "http://localhost/api/mlflow/runs?experiment_name=missing",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runs: unknown[] };
    expect(body.runs).toEqual([]);
  });

  it("returns MLflow upstream JSON error when search is non-OK", async () => {
    server.use(
      http.get(`${base}/api/2.0/mlflow/experiments/get-by-name`, () =>
        HttpResponse.json({ experiment: { experiment_id: "1", name: "X" } }),
      ),
      http.post(`${base}/api/2.0/mlflow/runs/search`, () =>
        HttpResponse.text("bad", { status: 500 }),
      ),
    );
    const req = new NextRequest("http://localhost/api/mlflow/runs?experiment_name=X");
    const res = await GET(req);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { upstreamStatus?: number };
    expect(body.upstreamStatus).toBe(500);
  });

  it("returns 503 when fetch to MLflow fails", async () => {
    server.use(
      http.get(`${base}/api/2.0/mlflow/experiments/get-by-name`, () =>
        HttpResponse.error(),
      ),
    );
    const req = new NextRequest("http://localhost/api/mlflow/runs?experiment_name=X");
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(MLFLOW_UNREACHABLE);
  });

  it("returns 403 when MLFLOW_PROXY_REQUIRE_LOOPBACK=1 and X-Forwarded-For is not loopback", async () => {
    process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = "1";
    server.use(
      http.get(`${base}/api/2.0/mlflow/experiments/get-by-name`, () =>
        HttpResponse.json({ experiment: { experiment_id: "1", name: "X" } }),
      ),
      http.post(`${base}/api/2.0/mlflow/runs/search`, () => HttpResponse.json({ runs: [] })),
    );
    const req = new NextRequest("http://localhost/api/mlflow/runs?experiment_name=X", {
      headers: { "x-forwarded-for": "8.8.8.8" },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
