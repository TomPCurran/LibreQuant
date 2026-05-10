import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";

import { server } from "@/lib/test/setup";

import { GET } from "./route";

describe("GET /api/pypi/search", () => {
  it("returns empty results when q has length < 2 (expected by current route)", async () => {
    // BUG: Phase 4 spec asked for 400 on empty query; route returns 200 + empty results.
    const req = new Request("http://localhost/api/pypi/search?q=a");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: unknown[] };
    expect(json.results).toEqual([]);
  });

  it("returns structured results when search HTML and JSON API succeed", async () => {
    server.use(
      http.get("https://pypi.org/search", ({ request }) => {
        const u = new URL(request.url);
        expect(u.searchParams.get("q")).toBe("pandas");
        const html = String.raw`<a href="/project/pandas/">pandas</a>`;
        return new HttpResponse(html, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }),
      http.get("https://pypi.org/pypi/:project/json", ({ params }) => {
        if (params.project !== "pandas") {
          return HttpResponse.json({}, { status: 404 });
        }
        return HttpResponse.json({
          info: { name: "pandas", summary: "Data analysis", version: "2.0.0" },
        });
      }),
    );
    const req = new Request("http://localhost/api/pypi/search?q=pandas");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      results: { name: string; summary: string; version?: string }[];
    };
    expect(json.results.some((r) => r.name === "pandas")).toBe(true);
    const row = json.results.find((r) => r.name === "pandas");
    expect(row?.summary).toContain("Data");
  });

  it("returns 400 when query is too long", async () => {
    const long = "x".repeat(121);
    const req = new Request(
      `http://localhost/api/pypi/search?q=${encodeURIComponent(long)}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 502 when search fetch fails", async () => {
    server.use(
      http.get("https://pypi.org/search", () => HttpResponse.error()),
    );
    const req = new Request("http://localhost/api/pypi/search?q=ab");
    const res = await GET(req);
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Search failed");
  });
});
