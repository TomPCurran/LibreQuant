/**
 * Write the current notebook JSON to a path the user picks on their machine (outside Docker).
 * Uses the File System Access API when the browser supports it (Chromium: native Save dialog);
 * otherwise triggers a download of an `.ipynb` file.
 *
 * @module save-notebook-to-host
 */

import type { INotebookContent } from "@jupyterlab/nbformat";
import { clientWarn } from "@/lib/client-log";

/** Above this serialized size (bytes), log a one-time dev warning — full string is still built (same as server save). */
export const LARGE_NOTEBOOK_EXPORT_WARN_BYTES = 10 * 1024 * 1024;

function ensureIpynbFilename(name: string): string {
  const t = name.trim() || "notebook.ipynb";
  return t.toLowerCase().endsWith(".ipynb") ? t : `${t}.ipynb`;
}

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
};

type ShowSaveFilePickerFn = (
  options?: SaveFilePickerOptions,
) => Promise<FileSystemFileHandle>;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Prompts for a destination file and writes pretty-printed notebook JSON.
 * No-op if the user cancels the picker (AbortError).
 */
export async function saveNotebookToHostFile(
  json: INotebookContent,
  suggestedBasename: string,
): Promise<void> {
  const filename = ensureIpynbFilename(suggestedBasename);
  const body = JSON.stringify(json, null, 2);
  if (body.length > LARGE_NOTEBOOK_EXPORT_WARN_BYTES) {
    clientWarn(
      `Large notebook export (~${Math.round(body.length / (1024 * 1024))} MiB serialized). Save still uses one in-memory copy, like server save.`,
    );
  }
  const blob = new Blob([body], { type: "application/x-ipynb+json" });

  const showSaveFilePicker = (
    window as Window & { showSaveFilePicker?: ShowSaveFilePickerFn }
  ).showSaveFilePicker;

  if (typeof showSaveFilePicker === "function") {
    try {
      const handle = await showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Jupyter Notebook",
            accept: { "application/x-ipynb+json": [".ipynb"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      clientWarn("showSaveFilePicker failed, falling back to download:", e);
    }
  }

  triggerDownload(blob, filename);
}
