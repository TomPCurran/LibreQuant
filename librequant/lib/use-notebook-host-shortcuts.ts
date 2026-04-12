"use client";

import { notebookStore } from "@datalayer/jupyter-react";
import { useEffect, type RefObject } from "react";

/**
 * Keyboard shortcuts when focus is inside the embedded notebook:
 *
 * - **Cmd/Ctrl+S** — flush debounced save to Jupyter (avoids the browser “Save Page” dialog).
 * - **Cmd+Z / Cmd+Shift+Z (macOS)** — undo / redo. `@datalayer/jupyter-react` only registers
 *   `Ctrl+Z` / `Ctrl+Y` in {@link NotebookCommands}, so ⌘Z does nothing on Mac until we bridge
 *   to {@link notebookStore.undo} / {@link notebookStore.redo} (same as the adapter’s undo path).
 *
 * Windows/Linux keep using Ctrl+Z / Ctrl+Y via Jupyter’s existing bindings.
 */
export function useNotebookHostShortcuts(
  hostRef: RefObject<HTMLElement | null>,
  notebookId: string,
  flushSave: () => void,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const host = hostRef.current;
      if (!host?.contains(e.target as Node)) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        flushSave();
        return;
      }

      if (e.metaKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          notebookStore.getState().redo(notebookId);
        } else {
          notebookStore.getState().undo(notebookId);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [hostRef, enabled, notebookId, flushSave]);
}
