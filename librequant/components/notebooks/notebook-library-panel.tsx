"use client";

import type { INotebookContent } from "@jupyterlab/nbformat";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getNotebookLibraryRoot } from "@/lib/env";
import {
  createUntitledNotebook,
  deleteNotebookPath,
  listNotebooksInLibrary,
  renameNotebookPath,
  uploadNotebookFile,
  type NotebookListItem,
} from "@/lib/jupyter-contents";
import { initialNotebook } from "@/lib/initial-notebook";
import { isNotebookContent } from "@/lib/notebook-local-storage";
import { notebookStemFromPath } from "@/lib/jupyter-paths";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(t);
}

export function NotebookLibraryPanel() {
  const router = useRouter();
  const libraryRoot = getNotebookLibraryRoot();
  const { serviceManager, error: mgrError } = useJupyterServiceManager();
  const [items, setItems] = useState<NotebookListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!serviceManager) return;
    setListError(null);
    setLoading(true);
    try {
      const list = await listNotebooksInLibrary(
        serviceManager.contents,
        libraryRoot,
      );
      setItems(list);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to list notebooks.");
    } finally {
      setLoading(false);
    }
  }, [libraryRoot, serviceManager]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onNewNotebook = async () => {
    if (!serviceManager) return;
    setBusyAction("new");
    try {
      const path = await createUntitledNotebook(
        serviceManager.contents,
        libraryRoot,
        initialNotebook as INotebookContent,
      );
      router.push(`/?path=${encodeURIComponent(path)}`);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not create notebook.");
    } finally {
      setBusyAction(null);
    }
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !serviceManager) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setListError("File is too large (max 8 MB).");
      return;
    }
    setBusyAction("upload");
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isNotebookContent(parsed)) {
        setListError("That file is not a valid Jupyter notebook (nbformat 4).");
        return;
      }
      const path = await uploadNotebookFile(
        serviceManager.contents,
        libraryRoot,
        file.name,
        parsed,
      );
      await refresh();
      router.push(`/?path=${encodeURIComponent(path)}`);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const onOpen = (path: string) => {
    router.push(`/?path=${encodeURIComponent(path)}`);
  };

  const startRename = (path: string) => {
    setRenamePath(path);
    setRenameValue(notebookStemFromPath(path));
  };

  const cancelRename = () => {
    setRenamePath(null);
    setRenameValue("");
  };

  const commitRename = async () => {
    if (!serviceManager || !renamePath) return;
    setBusyAction("rename");
    try {
      const newPath = await renameNotebookPath(
        serviceManager.contents,
        libraryRoot,
        renamePath,
        renameValue,
      );
      cancelRename();
      await refresh();
      router.push(`/?path=${encodeURIComponent(newPath)}`);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Rename failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const onDelete = async (path: string) => {
    if (!serviceManager) return;
    if (!window.confirm("Delete this notebook? This cannot be undone.")) return;
    setBusyAction("delete");
    try {
      await deleteNotebookPath(serviceManager.contents, libraryRoot, path);
      await refresh();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const combinedError = mgrError ?? listError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-light leading-relaxed text-text-secondary">
          Files live under{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            {libraryRoot}
          </code>{" "}
          on your Jupyter server (persisted when using Docker compose).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onNewNotebook()}
            disabled={!serviceManager || busyAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-alpha px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90 disabled:opacity-50"
          >
            {busyAction === "new" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            New Notebook
          </button>
          <button
            type="button"
            onClick={onUploadClick}
            disabled={!serviceManager || busyAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/12 bg-foreground/5 px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07] disabled:opacity-50"
          >
            {busyAction === "upload" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileUp className="size-4" aria-hidden />
            )}
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ipynb,application/x-ipynb+json,application/json"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(ev) => void onFileChange(ev)}
          />
        </div>
      </div>

      {combinedError ? (
        <div
          className="rounded-3xl border border-risk/30 bg-risk/5 px-4 py-3 text-sm font-light text-risk"
          role="alert"
        >
          {combinedError}
        </div>
      ) : null}

      {loading && !items.length ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm font-light text-text-secondary">
          <Loader2
            className="mr-2 size-5 animate-spin text-alpha"
            aria-hidden
          />
          Loading notebooks…
        </div>
      ) : null}

      {!loading && !items.length && !combinedError ? (
        <div className="glass rounded-4xl p-8 text-center">
          <p className="heading-brand text-lg text-text-primary">
            No notebooks yet
          </p>
          <p className="mt-2 text-sm font-light text-text-secondary">
            Create a new notebook or upload an{" "}
            <span className="font-mono-code text-[12px]">.ipynb</span> from your
            machine.
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-2">
            <caption className="sr-only">Notebooks in your library</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
                >
                  Last updated
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.path} className="glass rounded-3xl">
                  <td className="rounded-l-3xl px-4 py-4 align-middle">
                    {renamePath === row.path ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(ev) => setRenameValue(ev.target.value)}
                          className="min-w-[160px] flex-1 rounded-full border border-foreground/12 bg-background/80 px-3 py-2 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
                          aria-label="New notebook name"
                          autoFocus
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") void commitRename();
                            if (ev.key === "Escape") cancelRename();
                          }}
                        />
                        <button
                          type="button"
                          className="rounded-full bg-alpha px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                          onClick={() => void commitRename()}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-foreground/12 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
                          onClick={cancelRename}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-light text-text-primary">
                        {notebookStemFromPath(row.path)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-middle text-sm font-light tabular-nums text-text-secondary">
                    {formatDateTime(row.created)}
                  </td>
                  <td className="px-4 py-4 align-middle text-sm font-light tabular-nums text-text-secondary">
                    {formatDateTime(row.last_modified)}
                  </td>
                  <td className="rounded-r-3xl px-4 py-4 align-middle text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Open ${row.name}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-alpha/35 hover:text-alpha"
                        onClick={() => onOpen(row.path)}
                      >
                        <ExternalLink className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Rename ${row.name}`}
                        disabled={busyAction !== null}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-alpha/35 hover:text-alpha disabled:opacity-40"
                        onClick={() => startRename(row.path)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${row.name}`}
                        disabled={busyAction !== null}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-risk/40 hover:text-risk disabled:opacity-40"
                        onClick={() => void onDelete(row.path)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs font-light text-text-secondary">
        Prefer the file browser in Jupyter?{" "}
        <Link
          href="/"
          className="font-medium text-alpha underline-offset-2 hover:underline"
        >
          Open the workspace
        </Link>
        .
      </p>
    </div>
  );
}
