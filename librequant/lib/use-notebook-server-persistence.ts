"use client";

import { notebookStore } from "@datalayer/jupyter-react";
import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";
import { useEffect, useState } from "react";
import {
  getNotebookJson,
  saveNotebookJson,
} from "@/lib/jupyter-contents";
import { getNotebookLibraryRoot } from "@/lib/env";

/**
 * Loads notebook JSON from Jupyter Contents for `notebookPath`, debounces saves back to the server.
 *
 * `serverContentReady` is false until the first successful fetch for the current path. Callers
 * should not mount Jupyter `<Notebook>` until then — mounting with a client fallback and then
 * swapping in server JSON remounts the notebook and triggers JupyterLab null-model errors on
 * first open.
 */
export function useNotebookServerPersistence(
  contents: Contents.IManager | undefined,
  notebookId: string,
  notebookPath: string | null,
  notebookReady: boolean,
  fallback: INotebookContent,
): {
  nbformat: INotebookContent;
  serverContentReady: boolean;
  loadError: string | null;
} {
  const libraryRoot = getNotebookLibraryRoot();
  const [nbformat, setNbformat] = useState<INotebookContent>(fallback);
  const [serverContentReady, setServerContentReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncedNotebookPath, setSyncedNotebookPath] = useState(notebookPath);

  if (notebookPath !== syncedNotebookPath) {
    setSyncedNotebookPath(notebookPath);
    setNbformat(fallback);
    setServerContentReady(false);
    setLoadError(null);
  }

  useEffect(() => {
    if (!contents || !notebookPath) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const json = await getNotebookJson(contents, libraryRoot, notebookPath);
        if (cancelled) return;
        setNbformat(json);
        setLoadError(null);
        setServerContentReady(true);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load notebook.";
        setLoadError(msg);
        setServerContentReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contents, libraryRoot, notebookPath]);

  useEffect(() => {
    if (!contents || !notebookPath || !notebookReady) return;

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
        if (cancelled || !notebookPath) return;
        const current = notebookStore
          .getState()
          .selectNotebookAdapter(notebookId)?.model;
        if (!current || current.isDisposed) return;
        try {
          void saveNotebookJson(
            contents,
            libraryRoot,
            notebookPath,
            current.toJSON() as INotebookContent,
          ).catch((e) => {
            console.warn("[librequant] Notebook save failed:", e);
          });
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
  }, [contents, libraryRoot, notebookId, notebookPath, notebookReady]);

  return { nbformat, serverContentReady, loadError };
}
