"use client";

import { Loader2 } from "lucide-react";

/** MLflow equity artifact preview only (`curves/equity_curve.csv`), not a full run artifact browser. */
export function ExperimentRunArtifacts({
  equityText,
  equityLoading,
  equityError,
}: {
  equityText: string | null;
  equityLoading: boolean;
  equityError: string | null;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
        Equity curve artifact
      </p>
      {equityLoading ? (
        <p className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : equityError ? (
        <p className="text-xs text-text-secondary">{equityError}</p>
      ) : equityText ? (
        <pre className="max-h-48 overflow-auto rounded-md border border-foreground/10 bg-foreground/3 p-2 text-[11px] leading-relaxed text-text-primary">
          {equityText.slice(0, 12_000)}
          {equityText.length > 12_000 ? "\n…" : ""}
        </pre>
      ) : (
        <p className="text-xs text-text-secondary">
          No equity CSV found (expected{" "}
          <code className="rounded bg-foreground/10 px-1">curves/equity_curve.csv</code>).
        </p>
      )}
    </div>
  );
}
