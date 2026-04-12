"use client";

import { notebookStore } from "@datalayer/jupyter-react";
import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNotebookJson,
  saveNotebookJson,
} from "@/lib/jupyter-contents";
import { getNotebookLibraryRoot } from "@/lib/env";

export type NotebookServerSaveStatus =
  | { phase: "idle"; lastSavedAt: number | null }
  | { phase: "saving"; lastSavedAt: number | null }
  | { phase: "saved"; lastSavedAt: number }
  | { phase: "error"; lastSavedAt: number | null; message: string };

const IDLE: NotebookServerSaveStatus = { phase: "idle", lastSavedAt: null };

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
  /** Clears debounce and writes the current notebook model to the Jupyter server (Cmd/Ctrl-S). */
  flushNotebookSave: () => void;
  /** UI state for autosave feedback (saving / saved / last time). */
  notebookSaveStatus: NotebookServerSaveStatus;
} {
  const libraryRoot = getNotebookLibraryRoot();
  const flushNotebookSaveRef = useRef<(() => void) | null>(null);
  const [nbformat, setNbformat] = useState<INotebookContent>(fallback);
  const [serverContentReady, setServerContentReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncedNotebookPath, setSyncedNotebookPath] = useState(notebookPath);
  const [notebookSaveStatus, setNotebookSaveStatus] =
    useState<NotebookServerSaveStatus>(IDLE);

  if (notebookPath !== syncedNotebookPath) {
    setSyncedNotebookPath(notebookPath);
    setNbformat(fallback);
    setServerContentReady(false);
    setLoadError(null);
    setNotebookSaveStatus(IDLE);
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
    /** Browser timer id (`number`); avoid `NodeJS.Timeout` from ambient `setTimeout` typing. */
    let savedBannerTimer: number | undefined;

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

      let debounceTimer: ReturnType<typeof setTimeout> | undefined;

      const persist = async () => {
        if (cancelled || !notebookPath) return;
        const current = notebookStore
          .getState()
          .selectNotebookAdapter(notebookId)?.model;
        if (!current || current.isDisposed) return;

        setNotebookSaveStatus((prev) => ({
          phase: "saving",
          lastSavedAt: prev.lastSavedAt,
        }));

        try {
          await saveNotebookJson(
            contents,
            libraryRoot,
            notebookPath,
            current.toJSON() as INotebookContent,
          );
          if (cancelled) return;
          const at = Date.now();
          setNotebookSaveStatus({ phase: "saved", lastSavedAt: at });
          if (savedBannerTimer !== undefined) clearTimeout(savedBannerTimer);
          savedBannerTimer = window.setTimeout(() => {
            setNotebookSaveStatus({ phase: "idle", lastSavedAt: at });
          }, 2200);
        } catch (e) {
          if (cancelled) return;
          const message =
            e instanceof Error ? e.message : "Notebook save failed.";
          console.warn("[librequant] Notebook save failed:", e);
          setNotebookSaveStatus((prev) => ({
            phase: "error",
            lastSavedAt: prev.lastSavedAt,
            message,
          }));
        }
      };

      const flushSave = () => {
        if (debounceTimer !== undefined) clearTimeout(debounceTimer);
        void persist();
      };
      flushNotebookSaveRef.current = flushSave;

      const onContentChanged = () => {
        if (debounceTimer !== undefined) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          void persist();
        }, 450);
      };

      model.contentChanged.connect(onContentChanged);
      detach = () => {
        flushNotebookSaveRef.current = null;
        if (debounceTimer !== undefined) clearTimeout(debounceTimer);
        if (savedBannerTimer !== undefined) clearTimeout(savedBannerTimer);
        model.contentChanged.disconnect(onContentChanged);
      };
    };

    attach();

    return () => {
      cancelled = true;
      flushNotebookSaveRef.current = null;
      clearTimeout(pollTimer);
      detach?.();
    };
  }, [contents, libraryRoot, notebookId, notebookPath, notebookReady]);

  const flushNotebookSave = useCallback(() => {
    flushNotebookSaveRef.current?.();
  }, []);

  return {
    nbformat,
    serverContentReady,
    loadError,
    flushNotebookSave,
    notebookSaveStatus,
  };
}
