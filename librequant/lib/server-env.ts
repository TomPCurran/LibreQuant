import "server-only";

import { z } from "zod";

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, "");
}

const emptyToUndefined = (val: unknown): unknown => {
  if (val === undefined || val === null) return undefined;
  const t = String(val).trim();
  return t === "" ? undefined : t;
};

const serverEnvSchema = z
  .object({
    MLFLOW_TRACKING_URI: z.preprocess(
      emptyToUndefined,
      z.string().url().optional(),
    ),
    MLFLOW_API_BASE_URL: z.preprocess(
      emptyToUndefined,
      z.string().url().optional(),
    ),
  })
  .transform((o) => {
    const base =
      o.MLFLOW_TRACKING_URI ?? o.MLFLOW_API_BASE_URL ?? "http://127.0.0.1:5000";
    return { mlflowServerBaseUrl: stripTrailingSlash(base) };
  });

function parseServerEnv(): z.infer<typeof serverEnvSchema> {
  const result = serverEnvSchema.safeParse({
    MLFLOW_TRACKING_URI: process.env.MLFLOW_TRACKING_URI,
    MLFLOW_API_BASE_URL: process.env.MLFLOW_API_BASE_URL,
  });
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid server environment:\n${lines.join("\n")}`);
  }
  return result.data;
}

/** MLflow tracking API base URL (no trailing slash). Parsed once at module load from `MLFLOW_TRACKING_URI` / `MLFLOW_API_BASE_URL`. */
export const serverEnv = parseServerEnv();

/**
 * Reads `process.env` at call time so Vitest can toggle `MLFLOW_PROXY_REQUIRE_LOOPBACK`
 * between cases without reloading modules.
 */
export function isMlflowProxyLoopbackRequired(): boolean {
  return process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK === "1";
}
