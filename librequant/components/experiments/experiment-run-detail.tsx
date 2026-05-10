"use client";

import { Loader2, Tag } from "lucide-react";

import type { MlflowRun } from "@/lib/types/mlflow";

import { ExperimentRunArtifacts } from "./experiment-artifacts";
import { OOS_TAG_KEY } from "./use-experiment-explorer";

export function ExperimentRunDetail({
  run,
  equityText,
  equityLoading,
  equityError,
  onTagOos,
  tagging,
}: {
  run: MlflowRun;
  equityText: string | null;
  equityLoading: boolean;
  equityError: string | null;
  onTagOos: () => void;
  tagging: boolean;
}) {
  const entries = Object.entries(run.params).sort(([a], [b]) => a.localeCompare(b));
  const tagEntries = Object.entries(run.tags).sort(([a], [b]) => a.localeCompare(b));
  const oos = run.tags[OOS_TAG_KEY] === "true";

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-foreground/10 bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-primary">Run detail</p>
        <button
          type="button"
          disabled={tagging || oos}
          onClick={onTagOos}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1.5 text-[11px] font-medium text-text-primary transition hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {tagging ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Tag className="size-3.5" aria-hidden />
          )}
          {oos ? "Tagged OOS" : "Tag as OOS candidate"}
        </button>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Params
        </p>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {entries.length === 0 ? (
            <p className="text-xs text-text-secondary">No params</p>
          ) : (
            entries.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <dt className="shrink-0 text-text-secondary">{k}</dt>
                <dd className="min-w-0 break-all font-mono-code text-text-primary">
                  {v}
                </dd>
              </div>
            ))
          )}
        </dl>
      </div>

      {tagEntries.length > 0 ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Tags
          </p>
          <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {tagEntries.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-text-secondary">{k}</dt>
                <dd className="font-mono-code text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <ExperimentRunArtifacts
        equityText={equityText}
        equityLoading={equityLoading}
        equityError={equityError}
      />
    </div>
  );
}
