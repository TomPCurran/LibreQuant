"use client";

import "@/lib/ensure-webpack-public-path";
import { notebookStore, useNotebookStore } from "@datalayer/jupyter-react";
import { CirclePlus, Package, Pencil, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { getNotebookLibraryRoot } from "@/lib/env";
import { renameNotebookPath } from "@/lib/jupyter-contents";
import { notebookStemFromPath } from "@/lib/jupyter-paths";
import { notebookClearOutputsAndRestartKernel } from "@/lib/notebook-session-reset";
import { useWorkbenchStore } from "@/lib/stores/workbench-store";
import { useNotebookWorkbench } from "@/components/notebook/notebook-workbench-context";

export function LibreNotebookToolbar(props: { notebookId: string }) {
  const { notebookId } = props;
  const workbench = useNotebookWorkbench();
  const kernelStatus = useNotebookStore((s) =>
    s.selectKernelStatus(notebookId),
  );
  const isBusy = kernelStatus === "busy";
  const [resetting, setResetting] = useState(false);
  const setPackageSearchOpen = useWorkbenchStore((s) => s.setPackageSearchOpen);

  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);

  const beginRename = useCallback(() => {
    if (!workbench) return;
    setRenameError(null);
    setRenameDraft(notebookStemFromPath(workbench.notebookServerPath));
    setRenaming(true);
  }, [workbench]);

  const cancelRename = useCallback(() => {
    setRenaming(false);
    setRenameError(null);
  }, []);

  const commitRename = useCallback(async () => {
    if (!workbench) return;
    setRenameBusy(true);
    setRenameError(null);
    try {
      const libraryRoot = getNotebookLibraryRoot();
      const newPath = await renameNotebookPath(
        workbench.contents,
        libraryRoot,
        workbench.notebookServerPath,
        renameDraft,
      );
      setRenaming(false);
      workbench.onRenamed(newPath);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Rename failed.");
    } finally {
      setRenameBusy(false);
    }
  }, [renameDraft, workbench]);

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
      {workbench ? (
        <div className="flex flex-col gap-2 border-b border-black/6 pb-3 dark:border-white/10">
          {renaming ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={renameDraft}
                onChange={(ev) => setRenameDraft(ev.target.value)}
                disabled={renameBusy}
                className="min-w-[200px] flex-1 rounded-full border border-foreground/12 bg-background/80 px-3 py-2 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
                aria-label="Notebook name"
                autoFocus
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") void commitRename();
                  if (ev.key === "Escape") cancelRename();
                }}
              />
              <button
                type="button"
                disabled={renameBusy}
                onClick={() => void commitRename()}
                className="inline-flex items-center justify-center rounded-full bg-alpha px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Save Name
              </button>
              <button
                type="button"
                disabled={renameBusy}
                onClick={cancelRename}
                className="inline-flex items-center justify-center rounded-full border border-foreground/12 px-4 py-2 text-xs font-medium text-text-secondary transition hover:text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="heading-brand text-sm text-text-primary">
                {notebookStemFromPath(workbench.notebookServerPath)}
              </span>
              <button
                type="button"
                aria-label="Rename notebook"
                title="Rename notebook file"
                onClick={beginRename}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-alpha/35 hover:text-alpha"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
            </div>
          )}
          {renameError ? (
            <p className="text-xs font-light text-risk" role="alert">
              {renameError}
            </p>
          ) : null}
        </div>
      ) : null}
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
