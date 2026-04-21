import { describe, expect, it } from "vitest";

import { formatMlflowApiError } from "@/lib/mlflow-client-error";

describe("formatMlflowApiError", () => {
  it("uses fallback when json is not an object", () => {
    expect(formatMlflowApiError(null, "fallback")).toBe("fallback");
  });

  it("combines error, upstream, and detail", () => {
    expect(
      formatMlflowApiError(
        {
          error: "MLflow request failed",
          upstreamStatus: 404,
          detail: "not found",
        },
        "fallback",
      ),
    ).toBe("MLflow request failed (HTTP upstream 404) — not found");
  });
});
