"use client";

import type { ServiceManager } from "@jupyterlab/services";
import { FolderPlus, Loader2, Plus } from "lucide-react";

export function StrategyLibraryToolbar({
  serviceManager,
  busyAction,
  showNewForm,
  setShowNewForm,
  newStrategyName,
  setNewStrategyName,
  onCreateStrategy,
}: {
  serviceManager: ServiceManager.IManager | null;
  busyAction: string | null;
  showNewForm: boolean;
  setShowNewForm: (v: boolean) => void;
  newStrategyName: string;
  setNewStrategyName: (v: string) => void;
  onCreateStrategy: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showNewForm ? (
        <div className="flex items-center gap-2">
          <input
            value={newStrategyName}
            onChange={(e) => setNewStrategyName(e.target.value)}
            placeholder="strategy_name"
            className="min-w-[180px] rounded-full border border-foreground/12 bg-background/80 px-3 py-2 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
            aria-label="New strategy directory name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void onCreateStrategy();
              if (e.key === "Escape") {
                setShowNewForm(false);
                setNewStrategyName("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => void onCreateStrategy()}
            disabled={
              !serviceManager ||
              busyAction !== null ||
              !newStrategyName.trim()
            }
            className="inline-flex items-center justify-center gap-2 rounded-full bg-alpha px-4 py-2 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90 disabled:opacity-50"
          >
            {busyAction === "new" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewForm(false);
              setNewStrategyName("");
            }}
            className="rounded-full border border-foreground/12 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          disabled={!serviceManager || busyAction !== null}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-alpha px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90 disabled:opacity-50"
        >
          <FolderPlus className="size-4" aria-hidden />
          New Strategy
        </button>
      )}
    </div>
  );
}
