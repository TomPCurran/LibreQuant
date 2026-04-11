#!/usr/bin/env node
/**
 * Ensures `.env.local` exists before `next dev` / `next build` so `NEXT_PUBLIC_*` vars are
 * available when Next inlines them into the client bundle.
 */
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envLocal = path.join(root, ".env.local");
const envExample = path.join(root, ".env.example");

if (!existsSync(envLocal) && existsSync(envExample)) {
  copyFileSync(envExample, envLocal);
  console.log("[ensure-env] Created .env.local from .env.example");
}
