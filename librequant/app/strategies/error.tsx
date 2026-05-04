"use client";

import { useEffect } from "react";

import { WorkbenchShell } from "@/components/workbench-shell";
import { publicEnv } from "@/lib/env";

export default function StrategiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[strategies]", error);
  }, [error]);

  const isDev = publicEnv.nodeEnv === "development";

  return (
    <WorkbenchShell
      sectionEyebrow="Strategy library"
      title="Strategies"
      subtitle="Something went wrong loading this page."
    >
      <div className="rounded-lg border border-foreground/15 bg-foreground/5 p-4 text-sm text-text-secondary">
        {isDev ? (
          <p className="mb-3 font-mono-code text-xs text-risk wrap-break-word">
            {error.message}
          </p>
        ) : (
          <p className="mb-3 text-text-secondary">
            An unexpected error occurred. Try again or refresh the page.
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full border border-foreground/15 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-foreground/10"
        >
          Try again
        </button>
      </div>
    </WorkbenchShell>
  );
}
