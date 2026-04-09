import type { INotebookContent } from "@jupyterlab/nbformat";

/** Bump when the stored shape changes so we do not resurrect incompatible JSON. */
const STORAGE_KEY = "librequant:notebook:v1";

function isNotebookContent(value: unknown): value is INotebookContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.nbformat === 4 &&
    typeof v.nbformat_minor === "number" &&
    Array.isArray(v.cells)
  );
}

export function loadStoredNotebookContent(): INotebookContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isNotebookContent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveNotebookContent(content: INotebookContent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch (e) {
    console.warn("[librequant] Could not persist notebook (quota or storage error):", e);
  }
}
