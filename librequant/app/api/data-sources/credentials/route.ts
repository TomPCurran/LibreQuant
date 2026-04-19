import { NextResponse } from "next/server";
import { syncDataSourceSecretsToJupyter } from "@/lib/jupyter-sync-secrets";
import {
  MANAGED_SECRET_KEYS,
  mergeEnvLocal,
  type ManagedSecretKey,
} from "@/lib/merge-env-local";

export const runtime = "nodejs";

type Body = Partial<Record<ManagedSecretKey, string>> & {
  custom?: Record<string, string>;
};

function isManagedKey(k: string): k is ManagedSecretKey {
  return (MANAGED_SECRET_KEYS as readonly string[]).includes(k);
}

/**
 * Merge API key fields into `.env.local` (server filesystem only). Values are never logged.
 * Optional `custom` maps env var names to values; empty string removes a custom key.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Expected object body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const customRaw = o.custom;
  const custom: Record<string, string> = {};
  if (customRaw !== undefined) {
    if (customRaw === null || typeof customRaw !== "object") {
      return NextResponse.json({ error: "Invalid custom" }, { status: 400 });
    }
    for (const [k, v] of Object.entries(customRaw as Record<string, unknown>)) {
      if (typeof v !== "string") {
        return NextResponse.json({ error: `Invalid type for custom.${k}` }, { status: 400 });
      }
      custom[k] = v;
    }
  }

  const updates: Partial<Record<ManagedSecretKey, string>> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "custom") continue;
    if (!isManagedKey(k)) {
      return NextResponse.json({ error: `Unknown key: ${k}` }, { status: 400 });
    }
    if (v === null || v === undefined) {
      updates[k] = "";
    } else if (typeof v !== "string") {
      return NextResponse.json({ error: `Invalid type for ${k}` }, { status: 400 });
    } else {
      updates[k] = v;
    }
  }

  try {
    await mergeEnvLocal(updates, custom);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "merge failed";
    console.error("[data-sources/credentials] merge failed");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const jupyter = await syncDataSourceSecretsToJupyter();

  return NextResponse.json({ ok: true, ...jupyter });
}
