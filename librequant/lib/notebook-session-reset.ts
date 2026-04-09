import type { NotebookAdapter } from "@datalayer/jupyter-react";

/**
 * Clears all code cell outputs (execution state in the document) and restarts the
 * Jupyter kernel (clears in-memory variables). Does not remove cells or change source.
 */
export async function notebookClearOutputsAndRestartKernel(
  adapter: NotebookAdapter | undefined,
): Promise<void> {
  if (!adapter) {
    return;
  }

  const nb = adapter.notebook;
  if (nb.model && nb.widgets.length > 0) {
    if (!nb.activeCell) {
      adapter.setActiveCell(0);
    }
    adapter.clearAllOutputs();
  }

  await adapter.sessionContext.restartKernel();
}
