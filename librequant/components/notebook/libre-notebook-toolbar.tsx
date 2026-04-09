"use client";

import "@/lib/ensure-webpack-public-path";
import { notebookStore, useNotebookStore } from "@datalayer/jupyter-react";
import { CirclePlus, Package, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { notebookClearOutputsAndRestartKernel } from "@/lib/notebook-session-reset";
import { useWorkbenchStore } from "@/lib/stores/workbench-store";

export function LibreNotebookToolbar(props: { notebookId: string }) {
  const { notebookId } = props;
  const kernelStatus = useNotebookStore((s) =>
    s.selectKernelStatus(notebookId),
  );
  const isBusy = kernelStatus === "busy";
  const [resetting, setResetting] = useState(false);
  const setPackageSearchOpen = useWorkbenchStore((s) => s.setPackageSearchOpen);

  const onResetSession = useCallback(async () => {
    const adapter = notebookStore
      .getState()
      .selectNotebookAdapter(notebookId);
    setResetting(true);
    try {
      await notebookClearOutputsAndRestartKernel(adapter);
    } catch (e) {
      console.error("[librequant] Reset session failed:", e);
    } finally {
      setResetting(false);
    }
  }, [notebookId]);

  return (
    <div className="flex flex-col gap-3 border-b border-black/6 bg-transparent px-0 py-2 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Search and install PyPI packages"
            title="Install packages from PyPI"
            onClick={() => setPackageSearchOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 text-foreground transition hover:border-alpha/35 hover:text-alpha"
          >
            <Package className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Run all cells"
            title="Run all cells from top to bottom"
            onClick={() => notebookStore.getState().runAll(notebookId)}
            disabled={isBusy}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-alpha/25 bg-alpha/5 text-alpha transition hover:opacity-90 disabled:opacity-50 ${
              isBusy ? "animate-soft-pulse" : ""
            }`}
          >
            <Play className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Interrupt kernel"
            title="Send interrupt to the kernel"
            onClick={() => notebookStore.getState().interrupt(notebookId)}
            disabled={!isBusy}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 text-foreground transition hover:border-risk/40 hover:text-risk disabled:opacity-40"
          >
            <Square className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Add code cell below"
            title="Insert a new code cell below the active cell"
            onClick={() =>
              notebookStore.getState().insertBelow(notebookId, "code", "")
            }
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-4 text-xs font-medium text-foreground transition hover:border-alpha/35 hover:text-alpha"
          >
            <CirclePlus className="size-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Add cell</span>
          </button>
          <button
            type="button"
            aria-label="Clear outputs and restart kernel"
            title="Clear all cell outputs and restart the Python kernel (fresh variables)"
            onClick={() => void onResetSession()}
            disabled={isBusy || resetting}
            aria-busy={resetting}
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-4 text-xs font-medium text-foreground transition hover:bg-foreground/[0.07] disabled:opacity-50"
          >
            <RotateCcw
              className={`size-4 shrink-0 ${resetting ? "animate-spin" : ""}`}
              aria-hidden
            />
            <span className="hidden sm:inline">Reset session</span>
          </button>
        </div>
        <p className="text-xs font-medium text-text-secondary">
          {isBusy ? "Kernel busy" : "Kernel idle"}
        </p>
      </div>
      <p className="text-xs font-light leading-relaxed text-text-secondary">
        Reset session clears outputs and restarts the kernel (not the Docker server).
        Run executes every cell in order. Each cell has its own play and delete controls;{" "}
        <kbd className="rounded-md border border-foreground/15 bg-foreground/5 px-1.5 py-0.5 font-mono-code text-[10px] text-foreground/90">
          Shift
        </kbd>{" "}
        +{" "}
        <kbd className="rounded-md border border-foreground/15 bg-foreground/5 px-1.5 py-0.5 font-mono-code text-[10px] text-foreground/90">
          Enter
        </kbd>{" "}
        still runs the focused cell. Use Add cell or the + row at the bottom of the notebook.
      </p>
    </div>
  );
}
