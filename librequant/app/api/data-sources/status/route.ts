import fs from "node:fs/promises";

import { NextResponse } from "next/server";
import {
  MANAGED_SECRET_KEYS,
  envLocalAbsolutePath,
  listCustomEnvKeyNames,
  presenceForStatus,
  readEnvLocalMap,
} from "@/lib/merge-env-local";

export const runtime = "nodejs";

/**
 * Non-secret status: which credential keys are present in `.env.local` (boolean flags only).
 */
export async function GET() {
  const envPath = envLocalAbsolutePath();
  let fileExists = false;
  try {
    await fs.access(envPath);
    fileExists = true;
  } catch {
    fileExists = false;
  }

  const map = await readEnvLocalMap();
  const credentialsPresent = presenceForStatus(MANAGED_SECRET_KEYS, map);
  const customEnvKeys = listCustomEnvKeyNames(map);

  return NextResponse.json({
    envLocalFileExists: fileExists,
    credentialsPresent,
    customEnvKeys,
  });
}
