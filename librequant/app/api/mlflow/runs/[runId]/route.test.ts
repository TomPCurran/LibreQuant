import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { server } from "@/lib/test/setup";

import { PATCH } from "./route";

const base = "http://127.0.0.1:5000";

describe("PATCH /api/mlflow/runs/[runId]", () => {
  const prevLoop = process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;

  beforeEach(() => {
    delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
  });

  afterEach(() => {
    if (prevLoop === undefined) delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
    else process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = prevLoop;
  });

  it("returns 400 when runId is empty", async () => {
    const req = new NextRequest("http://localhost/api/mlflow/runs//", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: { k: "v" } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ runId: "" }) });
    expect(res.status).toBe(400);
  });

  it("returns 200 when body and upstream are valid", async () => {
    server.use(
      http.post(`${base}/api/2.0/mlflow/runs/update`, async ({ request }) => {
        const body = (await request.json()) as {
          run_id?: string;
          tags?: { key: string; value: string }[];
        };
        expect(body.run_id).toBe("r1");
        expect(body.tags).toEqual([{ key: "env", value: "prod" }]);
        return HttpResponse.json({ ok: true });
      }),
    );
    const req = new NextRequest("http://localhost/api/mlflow/runs/r1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: { env: "prod" } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ runId: "r1" }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean };
    expect(json.ok).toBe(true);
  });

  it("returns 400 for invalid tag key", async () => {
    const req = new NextRequest("http://localhost/api/mlflow/runs/r1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: { "bad key": "v" } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ runId: "r1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for strict extra keys", async () => {
    const req = new NextRequest("http://localhost/api/mlflow/runs/r1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: { k: "v" }, extra: 1 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ runId: "r1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 when loopback is required and client is not loopback", async () => {
    process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK = "1";
    server.use(
      http.post(`${base}/api/2.0/mlflow/runs/update`, () =>
        HttpResponse.json({ ok: true }),
      ),
    );
    const req = new NextRequest("http://localhost/api/mlflow/runs/r1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.5",
      },
      body: JSON.stringify({ tags: { k: "v" } }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ runId: "r1" }) });
    expect(res.status).toBe(403);
  });
});
