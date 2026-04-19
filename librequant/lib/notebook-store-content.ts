"use client";

import { notebookStore } from "@datalayer/jupyter-react";
import type { INotebookContent } from "@jupyterlab/nbformat";

/**
 * Reads the live notebook document from the Jupyter React store, or `null` if the adapter
 * is missing or the model is disposed.
 */
export function getNotebookContentFromStore(
  notebookId: string,
): INotebookContent | null {
  const adapter = notebookStore.getState().selectNotebookAdapter(notebookId);
  const model = adapter?.model;
  if (!model || model.isDisposed) return null;
  return model.toJSON() as INotebookContent;
}
