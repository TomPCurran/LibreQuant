"use client";

import { useEffect } from "react";

import { WorkbenchShell } from "@/components/workbench-shell";

export default function ExperimentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[experiments]", error);
  }, [error]);

  return (
    <WorkbenchShell
      sectionEyebrow="MLflow"
      title="Experiments"
      subtitle="Something went wrong loading this page."
    >
      <div className="rounded-lg border border-foreground/15 bg-foreground/5 p-4 text-sm text-text-secondary">
        <p className="mb-3">{error.message}</p>
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
