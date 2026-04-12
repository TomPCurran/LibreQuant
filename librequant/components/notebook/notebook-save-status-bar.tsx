"use client";

import { Check, Cloud, Loader2, AlertCircle } from "lucide-react";
import { formatSavedClock } from "@/lib/format-date-time";
import type { NotebookServerSaveStatus } from "@/lib/use-notebook-server-persistence";

type Props = {
  status: NotebookServerSaveStatus;
};

/**
 * Shown above the embedded notebook: autosave progress and last successful write time.
 */
export function NotebookSaveStatusBar({ status }: Props) {
  const { phase, lastSavedAt } = status;
  const err = phase === "error" ? status.message : null;

  return (
    <div
      className="mb-2 flex flex-wrap items-center justify-end gap-2 px-0.5"
      role="status"
      aria-live="polite"
    >
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-light transition ${
          phase === "error"
            ? "border-risk/35 bg-risk/5 text-risk"
            : "border-foreground/10 bg-foreground/[0.04] text-text-secondary"
        }`}
      >
        {phase === "saving" ? (
          <>
            <Loader2 className="size-3.5 shrink-0 animate-spin text-alpha" aria-hidden />
            <span>Saving to Jupyter…</span>
          </>
        ) : phase === "saved" ? (
          <>
            <Check className="size-3.5 shrink-0 text-alpha" aria-hidden />
            <span className="text-text-primary">Saved to workspace</span>
          </>
        ) : phase === "error" ? (
          <>
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            <span>{err ?? "Save failed"}</span>
          </>
        ) : (
          <>
            <Cloud
              className="size-3.5 shrink-0 text-text-secondary opacity-80"
              aria-hidden
            />
            <span>
              {lastSavedAt != null ? (
                <>
                  Auto-save on · Last saved{" "}
                  <time dateTime={new Date(lastSavedAt).toISOString()}>
                    {formatSavedClock(lastSavedAt)}
                  </time>
                </>
              ) : (
                <>Edits auto-save to your Jupyter server</>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
