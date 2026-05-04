import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { server } from "@/lib/test/setup";

import { GET } from "./route";

const base = "http://127.0.0.1:5000";

describe("GET /api/mlflow/artifacts/list", () => {
  const prevLoop = process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;

  beforeEach(() => {
    delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
  });

  afterEach(() => {
    if (prevLoop === undefined) delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
    else process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = prevLoop;
  });

  it("returns 400 when run_id is missing", async () => {
    const req = new NextRequest("http://localhost/api/mlflow/artifacts/list");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("proxies list POST to MLflow and returns JSON", async () => {
    server.use(
      http.post(`${base}/api/2.0/mlflow/artifacts/list`, async ({ request }) => {
        const body = (await request.json()) as { run_id?: string; path?: string };
        expect(body.run_id).toBe("run-1");
        expect(body.path).toBe("metrics");
        return HttpResponse.json({
          files: [{ path: "a.json", is_dir: false, file_size: 3 }],
        });
      }),
    );
    const req = new NextRequest(
      "http://localhost/api/mlflow/artifacts/list?run_id=run-1&path=metrics",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      files?: { path: string; is_dir: boolean }[];
    };
    expect(json.files?.[0]?.path).toBe("a.json");
  });

  it("returns 403 when MLFLOW_PROXY_REQUIRE_LOOPBACK=1 and forwarded client is not loopback", async () => {
    process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = "1";
    server.use(
      http.post(`${base}/api/2.0/mlflow/artifacts/list`, () =>
        HttpResponse.json({ files: [] }),
      ),
    );
    const req = new NextRequest(
      "http://localhost/api/mlflow/artifacts/list?run_id=run-1",
      {
        headers: { "x-forwarded-for": "8.8.8.8" },
      },
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
