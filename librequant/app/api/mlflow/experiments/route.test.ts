import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { MLFLOW_UNREACHABLE } from "@/lib/mlflow-http";

const fetchMlflow = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mlflow-server", () => ({
  fetchMlflow,
  getMlflowServerBaseUrl: () => "http://127.0.0.1:5000",
}));

import { GET } from "./route";

describe("GET /api/mlflow/experiments", () => {
  beforeEach(() => {
    fetchMlflow.mockReset();
  });

  it("maps MLflow search response to experiment summaries", async () => {
    fetchMlflow.mockResolvedValue(
      new Response(
        JSON.stringify({
          experiments: [
            { experiment_id: "1", name: "Default" },
            { experiment_id: "2", name: "Other" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const req = new NextRequest("http://localhost/api/mlflow/experiments");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      experiments: { experimentId: string; name: string }[];
    };
    expect(body.experiments).toEqual([
      { experimentId: "1", name: "Default" },
      { experimentId: "2", name: "Other" },
    ]);
    expect(fetchMlflow).toHaveBeenCalledWith(
      "http://127.0.0.1:5000/api/2.0/mlflow/experiments/search",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("returns upstream JSON error when MLflow responds non-OK", async () => {
    fetchMlflow.mockResolvedValue(
      new Response("not found", { status: 404 }),
    );

    const req = new NextRequest("http://localhost/api/mlflow/experiments");
    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      error: string;
      upstreamStatus: number;
      detail?: string;
    };
    expect(body.error).toBe("MLflow request failed");
    expect(body.upstreamStatus).toBe(404);
    expect(body.detail).toBe("not found");
  });

  it("returns 503 when MLflow is unreachable", async () => {
    fetchMlflow.mockRejectedValue(new TypeError("fetch failed"));

    const req = new NextRequest("http://localhost/api/mlflow/experiments");
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(MLFLOW_UNREACHABLE);
  });
});
