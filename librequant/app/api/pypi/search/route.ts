import { NextResponse } from "next/server";
import type { PyPIProjectSummary } from "@/lib/types/pypi";

const USER_AGENT = "LibreQuant/0.1 (+https://github.com/)";

/**
 * Best-effort PyPI search: parses the public search HTML and enriches hits via the JSON API.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] satisfies PyPIProjectSummary[] });
  }
  if (q.length > 120) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const searchRes = await fetch(
      `https://pypi.org/search/?q=${encodeURIComponent(q)}`,
      {
        headers: {
          Accept: "text/html",
          "User-Agent": USER_AGENT,
        },
        next: { revalidate: 60 },
      },
    );

    let names: string[] = [];
    if (searchRes.ok) {
      const html = await searchRes.text();
      const seen = new Set<string>();
      for (const m of html.matchAll(/href="\/project\/([^/]+)\//g)) {
        const raw = m[1];
        if (!raw) continue;
        try {
          const decoded = decodeURIComponent(raw.replace(/\+/g, " "));
          if (!seen.has(decoded)) {
            seen.add(decoded);
            names.push(decoded);
          }
        } catch {
          /* ignore */
        }
        if (names.length >= 20) break;
      }
    }

    if (names.length === 0) {
      const direct = await fetchJsonSummary(q);
      if (direct) {
        return NextResponse.json({ results: [direct] satisfies PyPIProjectSummary[] });
      }
      return NextResponse.json({ results: [] satisfies PyPIProjectSummary[] });
    }

    const enriched = await Promise.all(
      names.map(async (name) => {
        const s = await fetchJsonSummary(name);
        return (
          s ?? {
            name,
            summary: "",
          }
        );
      }),
    );

    return NextResponse.json({ results: enriched });
  } catch (e) {
    console.error("[pypi/search]", e);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}

async function fetchJsonSummary(
  project: string,
): Promise<PyPIProjectSummary | null> {
  try {
    const res = await fetch(
      `https://pypi.org/pypi/${encodeURIComponent(project)}/json`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      info?: {
        name?: string;
        summary?: string;
        version?: string;
      };
    };
    const info = data.info;
    if (!info?.name) return null;
    return {
      name: info.name,
      summary: (info.summary ?? "").trim(),
      version: info.version,
    };
  } catch {
    return null;
  }
}
