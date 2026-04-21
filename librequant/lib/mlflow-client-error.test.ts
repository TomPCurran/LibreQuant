import { describe, expect, it } from "vitest";

import { formatMlflowApiError } from "@/lib/mlflow-client-error";

describe("formatMlflowApiError", () => {
  it("uses fallback when json is not an object", () => {
    expect(formatMlflowApiError(null, "fallback")).toBe("fallback");
  });

  it("leads with detail when error is the generic BFF phrase", () => {
    expect(
      formatMlflowApiError(
        {
          error: "MLflow request failed",
          upstreamStatus: 404,
          detail: "not found",
        },
        "fallback",
      ),
    ).toBe("not found (HTTP upstream 404)");
  });

  it("leads with detail when error is absent", () => {
    expect(
      formatMlflowApiError(
        {
          upstreamStatus: 502,
          detail: "upstream body",
        },
        "fallback",
      ),
    ).toBe("upstream body (HTTP upstream 502)");
  });

  it("combines specific error, upstream, and detail", () => {
    expect(
      formatMlflowApiError(
        {
          error: "Validation failed",
          upstreamStatus: 400,
          detail: "bad param",
        },
        "fallback",
      ),
    ).toBe("Validation failed (HTTP upstream 400) — bad param");
  });

  it("uses generic BFF error when there is no detail", () => {
    expect(
      formatMlflowApiError(
        {
          error: "MLflow request failed",
          upstreamStatus: 503,
        },
        "fallback",
      ),
    ).toBe("MLflow request failed (HTTP upstream 503)");
  });
});
