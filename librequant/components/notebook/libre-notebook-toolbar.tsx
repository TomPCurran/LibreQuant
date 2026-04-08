"use client";

import "@/lib/ensure-webpack-public-path";
import { useNotebookStore } from "@datalayer/jupyter-react";
import { CirclePlus, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { notebookClearOutputsAndRestartKernel } from "@/lib/notebook-session-reset";

export function LibreNotebookToolbar(props: { notebookId: string }) {
  const { notebookId } = props;
  const notebookStore = useNotebookStore();
  const kernelStatus = notebookStore.selectKernelStatus(notebookId);
  const isBusy = kernelStatus === "busy";
  const [resetting, setResetting] = useState(false);

  const onResetSession = useCallback(async () => {
    const adapter = notebookStore.selectNotebookAdapter(notebookId);
    setResetting(true);
    try {
      await notebookClearOutputsAndRestartKernel(adapter);
    } catch (e) {
      console.error("[librequant] Reset session failed:", e);
    } finally {
      setResetting(false);
    }
  }, [notebookId, notebookStore]);

  return (
    <div className="flex flex-col gap-2 border-b border-foreground/6 bg-transparent px-1 py-2 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Run active cell"
            title="Run the focused cell (Shift+Enter)"
            onClick={() => notebookStore.run(notebookId)}
            disabled={isBusy}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-teal/35 bg-brand-teal/10 text-brand-teal transition hover:bg-brand-teal/15 disabled:opacity-50 ${
              isBusy ? "animate-soft-pulse" : ""
            }`}
          >
            <Play className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Interrupt kernel"
            title="Send interrupt to the kernel"
            onClick={() => notebookStore.interrupt(notebookId)}
            disabled={!isBusy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-foreground/15 bg-foreground/5 text-foreground transition hover:border-brand-rose/40 hover:text-brand-rose disabled:opacity-40"
          >
            <Square className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Add code cell below"
            title="Insert a new code cell below the active cell"
            onClick={() => notebookStore.insertBelow(notebookId, "code", "")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/5 px-2.5 text-xs font-medium text-foreground transition hover:border-brand-teal/35 hover:text-brand-teal"
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/5 px-2.5 text-xs font-medium text-foreground transition hover:border-foreground/25 hover:bg-foreground/[0.07] disabled:opacity-50"
          >
            <RotateCcw
              className={`size-4 shrink-0 ${resetting ? "animate-spin" : ""}`}
              aria-hidden
            />
            <span className="hidden sm:inline">Reset session</span>
          </button>
        </div>
        <p className="text-[11px] uppercase tracking-widest text-text-secondary">
          {isBusy ? "Kernel busy" : "Kernel idle"}
        </p>
      </div>
      <p className="text-[11px] leading-snug text-text-secondary">
        Reset session clears outputs and restarts the kernel (not the Docker server).
        Click a cell to focus it, then Run or{" "}
        <kbd className="rounded border border-foreground/15 bg-foreground/5 px-1 font-mono-code text-[10px] text-foreground/90">
          Shift
        </kbd>{" "}
        +{" "}
        <kbd className="rounded border border-foreground/15 bg-foreground/5 px-1 font-mono-code text-[10px] text-foreground/90">
          Enter
        </kbd>
        . Use Add cell or the + row at the bottom of the notebook.
      </p>
    </div>
  );
}
