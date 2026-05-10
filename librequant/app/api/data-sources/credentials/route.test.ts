import { describe, it, expect, vi, beforeEach } from "vitest";

const mergeEnvLocalMock = vi.hoisted(() => vi.fn());
const syncDataSourceSecretsToJupyterMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/merge-env-local", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/merge-env-local")>();
  return { ...mod, mergeEnvLocal: mergeEnvLocalMock };
});

vi.mock("@/lib/jupyter-sync-secrets", () => ({
  syncDataSourceSecretsToJupyter: syncDataSourceSecretsToJupyterMock,
}));

import { POST } from "./route";

describe("POST /api/data-sources/credentials", () => {
  beforeEach(() => {
    mergeEnvLocalMock.mockReset();
    syncDataSourceSecretsToJupyterMock.mockReset();
    mergeEnvLocalMock.mockResolvedValue(undefined);
    syncDataSourceSecretsToJupyterMock.mockResolvedValue({ jupyterSync: "ok" });
  });

  it("returns 200, calls merge and sync, and JSON has no secret values", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ POLYGON_API_KEY: "secret-value-never-in-response" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.jupyterSync).toBe("ok");
    expect(JSON.stringify(json)).not.toContain("secret-value-never-in-response");
    expect(mergeEnvLocalMock).toHaveBeenCalledWith(
      { POLYGON_API_KEY: "secret-value-never-in-response" },
      {},
    );
    expect(syncDataSourceSecretsToJupyterMock).toHaveBeenCalledTimes(1);
  });

  it("passes custom map to mergeEnvLocal", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ALPACA_API_KEY: "",
        custom: { MYBACKEND_KEY: "v" },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(JSON.stringify(json)).not.toContain('"v"');
    expect(mergeEnvLocalMock).toHaveBeenCalledWith(
      { ALPACA_API_KEY: "" },
      { MYBACKEND_KEY: "v" },
    );
  });

  it("merges jupyter sync fields into JSON without secrets", async () => {
    syncDataSourceSecretsToJupyterMock.mockResolvedValue({
      jupyterSync: "failed",
      jupyterSyncError: "network",
    });
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ TIINGO_API_KEY: "x" }),
    });
    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.jupyterSync).toBe("failed");
    expect(json.jupyterSyncError).toBe("network");
    expect(json).not.toHaveProperty("TIINGO_API_KEY");
  });

  it("returns 400 for unknown top-level key and does not call merge", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ NOT_A_MANAGED_KEY: "x" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mergeEnvLocalMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mergeEnvLocalMock).not.toHaveBeenCalled();
  });

  it("returns 400 for non-object body", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(null),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid custom shape", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom: "not-an-object" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mergeEnvLocalMock).not.toHaveBeenCalled();
  });

  it("returns 400 when custom value is not a string", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom: { MYBACKEND_KEY: 1 } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when managed value is not a string", async () => {
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ POLYGON_API_KEY: 123 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when mergeEnvLocal throws", async () => {
    mergeEnvLocalMock.mockRejectedValue(new Error("Invalid custom environment variable name: BAD"));
    const req = new Request("http://localhost/api/data-sources/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ POLYGON_API_KEY: "k" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toContain("Invalid custom");
  });
});
