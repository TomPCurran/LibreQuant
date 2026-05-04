/**
 * Vitest global setup: MSW server + stable MLflow env before modules that read `serverEnv` load.
 */

if (!String(process.env.MLFLOW_TRACKING_URI ?? "").trim()) {
  process.env.MLFLOW_TRACKING_URI = "http://127.0.0.1:5000";
}
if (process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK === "") {
  delete process.env.MLFLOW_PROXY_REQUIRE_LOOPBACK;
}

import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
