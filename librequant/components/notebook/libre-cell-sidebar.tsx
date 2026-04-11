"use client";

import type { ICellModel } from "@jupyterlab/cells";
import { notebookStore, useNotebookStore } from "@datalayer/jupyter-react";
import { Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useWorkbenchStore } from "@/lib/stores/workbench-store";

/** Matches {@link ICellSidebarProps} from jupyter-react (factory-injected cell gutter). */
type LibreCellSidebarProps = {
  commands: import("@lumino/commands").CommandRegistry;
  /** Can be null briefly during Jupyter teardown / strict-mode remounts */
  model: ICellModel | null;
  nbgrader: boolean;
};

function cellIndexForModel(
  model: ICellModel | null | undefined,
  notebookId: string,
): number {
  if (!model || !notebookId) {
    return -1;
  }
  const adapter = notebookStore.getState().selectNotebookAdapter(notebookId);
  const cells = adapter?.notebook?.model?.cells;
  if (!cells) {
    return -1;
  }
  for (let i = 0; i < cells.length; i++) {
    if (cells.get(i) === model) {
      return i;
    }
  }
  return -1;
}

/**
 * Re-render when the notebook cell list changes so indices stay correct after insert/delete.
 */
function useNotebookCellsRevision(notebookId: string) {
  const adapter = useNotebookStore((s) =>
    notebookId ? s.selectNotebookAdapter(notebookId) : undefined,
  );
  const [, setRevision] = useState(0);
  useEffect(() => {
    const cells = adapter?.notebook?.model?.cells;
    if (!cells) {
      return;
    }
    const onChanged = () => {
      setRevision((n) => n + 1);
    };
    cells.changed.connect(onChanged);
    return () => {
      cells.changed.disconnect(onChanged);
    };
  }, [adapter, notebookId]);
}

/**
 * Per-cell actions injected by {@link CellSidebarExtension} (right gutter of each cell).
 */
export function LibreCellSidebar({
  model,
  nbgrader: _nbgrader,
}: LibreCellSidebarProps) {
  void _nbgrader;
  /** Jupyter may mount the cell gutter outside `Notebook`’s React subtree; use global store, not context. */
  const notebookId = useWorkbenchStore((s) => s.activeNotebookId) ?? "";
  useNotebookCellsRevision(notebookId);
  const kernelStatus = useNotebookStore((s) =>
    notebookId ? s.selectKernelStatus(notebookId) : "idle",
  );
  const strategyPathStatus = useWorkbenchStore((s) => s.strategyPathStatus);
  const isBusy = kernelStatus === "busy";
  const runBlockedByStrategyPath = strategyPathStatus === "pending";

  const index = cellIndexForModel(model, notebookId);

  const runThisCell = useCallback(async () => {
    if (!model || index < 0) {
      return;
    }
    const adapter = notebookStore.getState().selectNotebookAdapter(notebookId);
    if (!adapter) {
      return;
    }
    try {
      await adapter.runCell({ index });
    } catch (e) {
      console.error("[librequant] Run cell failed:", e);
    }
  }, [index, model, notebookId]);

  const deleteThisCell = useCallback(() => {
    if (!model || index < 0) {
      return;
    }
    try {
      notebookStore.getState().deleteCell(notebookId, index);
    } catch (e) {
      console.error("[librequant] Delete cell failed:", e);
    }
  }, [index, model, notebookId]);

  if (!notebookId || !model) {
    return (
      <div
        className="flex w-8 flex-col items-center gap-1 pt-0.5"
        aria-hidden
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 pt-0.5">
      <button
        type="button"
        aria-label="Run this cell"
        title={
          runBlockedByStrategyPath
            ? "Wait until the strategies library path is ready on the kernel"
            : "Run this cell"
        }
        disabled={isBusy || index < 0 || runBlockedByStrategyPath}
        onClick={() => void runThisCell()}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-alpha/30 bg-alpha/10 text-alpha transition hover:bg-alpha/20 disabled:opacity-40"
      >
        <Play className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Delete this cell"
        title="Delete this cell"
        disabled={index < 0}
        onClick={deleteThisCell}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 text-foreground transition hover:border-risk/40 hover:text-risk disabled:opacity-40"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
