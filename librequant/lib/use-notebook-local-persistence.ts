"use client";

import { notebookStore } from "@datalayer/jupyter-react";
import type { INotebookContent } from "@jupyterlab/nbformat";
import { useEffect, useState } from "react";
import {
  loadStoredNotebookContent,
  saveNotebookContent,
} from "@/lib/notebook-local-storage";

/**
 * Restores the workspace notebook from localStorage after mount (avoids SSR hydration
 * mismatch) and persists edits by debouncing JupyterLab's NotebookModel#contentChanged.
 */
export function useNotebookLocalPersistence(
  notebookId: string,
  notebookReady: boolean,
  fallback: INotebookContent,
): { nbformat: INotebookContent; notebookMountKey: number } {
  const [nbformat, setNbformat] = useState<INotebookContent>(fallback);
  const [notebookMountKey, setNotebookMountKey] = useState(0);

  useEffect(() => {
    const stored = loadStoredNotebookContent();
    if (stored) {
      setNbformat(stored);
      setNotebookMountKey((k) => k + 1);
    }
  }, []);

  useEffect(() => {
    if (!notebookReady) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let detach: (() => void) | undefined;

    const attach = () => {
      if (cancelled) return;
      const adapter = notebookStore
        .getState()
        .selectNotebookAdapter(notebookId);
      const model = adapter?.model;
      if (!model || model.isDisposed) {
        pollTimer = setTimeout(attach, 50);
        return;
      }

      let debounceTimer: ReturnType<typeof setTimeout>;
      const persist = () => {
        if (cancelled || model.isDisposed) return;
        try {
          saveNotebookContent(model.toJSON());
        } catch (e) {
          console.warn("[librequant] Notebook serialize failed:", e);
        }
      };

      const onContentChanged = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(persist, 450);
      };

      model.contentChanged.connect(onContentChanged);
      detach = () => {
        clearTimeout(debounceTimer);
        model.contentChanged.disconnect(onContentChanged);
      };
    };

    attach();

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      detach?.();
    };
  }, [notebookReady, notebookId]);

  return { nbformat, notebookMountKey };
}
