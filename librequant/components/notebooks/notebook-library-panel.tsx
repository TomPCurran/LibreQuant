"use client";

import type { INotebookContent } from "@jupyterlab/nbformat";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileUp,
  FolderOpen,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getNotebookLibraryRoot } from "@/lib/env";
import {
  createNotebookFolder,
  createUntitledNotebook,
  deleteNotebookPath,
  listNotebookFolders,
  moveNotebookToFolder,
  renameNotebookPath,
  uploadNotebookFile,
} from "@/lib/jupyter-contents";
import type { NotebookFolderItem, NotebookListItem } from "@/lib/types/notebook";
import { initialNotebook } from "@/lib/initial-notebook";
import { isNotebookContent } from "@/lib/notebook-local-storage";
import { notebookStemFromPath } from "@/lib/jupyter-paths";
import { ONBOARDING_NOTEBOOKS } from "@/lib/notebook-onboarding";
import { formatDateTime } from "@/lib/format-date-time";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const DRAG_MIME = "application/x-librequant-notebook-path";

const NotebookRow = memo(function NotebookRow({
  row,
  busyAction,
  renamePath,
  renameValue,
  setRenameValue,
  onOpen,
  startRename,
  cancelRename,
  commitRename,
  onDelete,
}: {
  row: NotebookListItem;
  busyAction: string | null;
  renamePath: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onOpen: (path: string) => void;
  startRename: (path: string) => void;
  cancelRename: () => void;
  commitRename: () => void;
  onDelete: (path: string) => void;
}) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, row.path);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <tr
      className="glass cursor-grab rounded-3xl active:cursor-grabbing"
      draggable
      onDragStart={onDragStart}
    >
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
  );
});

const NotebookTable = memo(function NotebookTable({
  notebooks,
  caption,
  busyAction,
  renamePath,
  renameValue,
  setRenameValue,
  onOpen,
  startRename,
  cancelRename,
  commitRename,
  onDelete,
}: {
  notebooks: NotebookListItem[];
  caption: string;
  busyAction: string | null;
  renamePath: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onOpen: (path: string) => void;
  startRename: (path: string) => void;
  cancelRename: () => void;
  commitRename: () => void;
  onDelete: (path: string) => void;
}) {
  if (notebooks.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-y-2">
        <caption className="sr-only">{caption}</caption>
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
          {notebooks.map((row) => (
            <NotebookRow
              key={row.path}
              row={row}
              busyAction={busyAction}
              renamePath={renamePath}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onOpen={onOpen}
              startRename={startRename}
              cancelRename={cancelRename}
              commitRename={commitRename}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

export function NotebookLibraryPanel() {
  const router = useRouter();
  const libraryRoot = getNotebookLibraryRoot();
  const { serviceManager, error: mgrError } = useJupyterServiceManager();
  const [folders, setFolders] = useState<NotebookFolderItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renamePathRef = useRef(renamePath);
  const renameValueRef = useRef(renameValue);
  renamePathRef.current = renamePath;
  renameValueRef.current = renameValue;

  const refresh = useCallback(async () => {
    if (!serviceManager) return;
    setListError(null);
    setLoading(true);
    try {
      const list = await listNotebookFolders(
        serviceManager.contents,
        libraryRoot,
      );
      setFolders(list);
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Failed to list notebooks.",
      );
    } finally {
      setLoading(false);
    }
  }, [libraryRoot, serviceManager]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalNotebooks = folders.reduce(
    (sum, f) => sum + f.notebooks.length,
    0,
  );

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
      setListError(
        e instanceof Error ? e.message : "Could not create notebook.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const onNewFolder = async () => {
    if (!serviceManager || !newFolderName.trim()) return;
    setBusyAction("folder");
    try {
      const dirPath = await createNotebookFolder(
        serviceManager.contents,
        libraryRoot,
        newFolderName,
      );
      setNewFolderName("");
      setShowNewFolder(false);
      await refresh();
      setExpanded((prev) => new Set(prev).add(dirPath));
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Could not create folder.",
      );
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
        setListError(
          "That file is not a valid Jupyter notebook (nbformat 4).",
        );
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

  const onOpen = useCallback(
    (path: string) => {
      router.push(`/?path=${encodeURIComponent(path)}`);
    },
    [router],
  );

  const startRename = useCallback(
    (path: string) => {
      setRenamePath(path);
      setRenameValue(notebookStemFromPath(path));
    },
    [],
  );

  const cancelRename = useCallback(() => {
    setRenamePath(null);
    setRenameValue("");
  }, []);

  const commitRename = useCallback(async () => {
    const rp = renamePathRef.current;
    const rv = renameValueRef.current;
    if (!serviceManager || !rp) return;
    setBusyAction("rename");
    try {
      const newPath = await renameNotebookPath(
        serviceManager.contents,
        libraryRoot,
        rp,
        rv,
      );
      setRenamePath(null);
      setRenameValue("");
      await refresh();
      router.push(`/?path=${encodeURIComponent(newPath)}`);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Rename failed.");
    } finally {
      setBusyAction(null);
    }
  }, [serviceManager, libraryRoot, refresh, router]);

  const onDelete = useCallback(
    async (path: string) => {
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
    },
    [serviceManager, libraryRoot, refresh],
  );

  const onDeleteFolder = useCallback(
    async (folderPath: string) => {
      if (!serviceManager) return;
      if (
        !window.confirm(
          "Delete this folder and all notebooks inside it? This cannot be undone.",
        )
      )
        return;
      setBusyAction("delete");
      try {
        await deleteNotebookPath(serviceManager.contents, libraryRoot, folderPath);
        await refresh();
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Delete failed.");
      } finally {
        setBusyAction(null);
      }
    },
    [serviceManager, libraryRoot, refresh],
  );

  const onMoveToFolder = useCallback(
    async (notebookPath: string, folderPath: string) => {
      if (!serviceManager) return;
      setBusyAction("move");
      try {
        await moveNotebookToFolder(
          serviceManager.contents,
          libraryRoot,
          notebookPath,
          folderPath,
        );
        await refresh();
        setExpanded((prev) => new Set(prev).add(folderPath));
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Move failed.");
      } finally {
        setBusyAction(null);
      }
    },
    [serviceManager, libraryRoot, refresh],
  );

  const onMoveToRoot = useCallback(
    async (notebookPath: string) => {
      if (!serviceManager) return;
      setBusyAction("move");
      try {
        await moveNotebookToFolder(
          serviceManager.contents,
          libraryRoot,
          notebookPath,
          libraryRoot,
        );
        await refresh();
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Move failed.");
      } finally {
        setBusyAction(null);
      }
    },
    [serviceManager, libraryRoot, refresh],
  );

  const handleFolderDragOver = (e: React.DragEvent, folderPath: string) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder(folderPath);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent, folderPath: string) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    if (dragOverFolder === folderPath) setDragOverFolder(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    const notebookPath = e.dataTransfer.getData(DRAG_MIME);
    if (!notebookPath) return;
    const parentDir = notebookPath.substring(
      0,
      notebookPath.lastIndexOf("/"),
    );
    if (parentDir === folderPath) return;
    void onMoveToFolder(notebookPath, folderPath);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder("__root__");
    }
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    if (dragOverFolder === "__root__") setDragOverFolder(null);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);
    const notebookPath = e.dataTransfer.getData(DRAG_MIME);
    if (!notebookPath) return;
    const parentDir = notebookPath.substring(
      0,
      notebookPath.lastIndexOf("/"),
    );
    if (parentDir === libraryRoot) return;
    void onMoveToRoot(notebookPath);
  };

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const commitRenameFire = useCallback(() => void commitRename(), [commitRename]);
  const onDeleteFire = useCallback(
    (path: string) => void onDelete(path),
    [onDelete],
  );

  const tableProps = useMemo(
    () => ({
      busyAction,
      renamePath,
      renameValue,
      setRenameValue,
      onOpen,
      startRename,
      cancelRename,
      commitRename: commitRenameFire,
      onDelete: onDeleteFire,
    }),
    [
      busyAction,
      renamePath,
      renameValue,
      onOpen,
      startRename,
      cancelRename,
      commitRenameFire,
      onDeleteFire,
    ],
  );

  const combinedError = mgrError ?? listError;

  const rootFolder = folders.find((f) => f.name === "");
  const subFolders = folders.filter((f) => f.name !== "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-light leading-relaxed text-text-secondary">
          Files live under{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            {libraryRoot}
          </code>{" "}
          on your Jupyter server (persisted when using Docker compose). With Compose,           demo
          notebooks from the repository —{" "}
          {ONBOARDING_NOTEBOOKS.map((name, i) => (
            <span key={name}>
              {i > 0 ? " and " : null}
              <code className="font-mono-code text-[12px]">{name}</code>
            </span>
          ))}{" "}
          — are
          copied into this folder on Jupyter container start when those files are not already
          present (restart the <code className="font-mono-code text-[12px]">jupyter</code>{" "}
          service to pick them up).
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
          {showNewFolder ? (
            <div className="flex items-center gap-2">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="folder_name"
                className="min-w-[140px] rounded-full border border-foreground/12 bg-background/80 px-3 py-2 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
                aria-label="New folder name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onNewFolder();
                  if (e.key === "Escape") {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void onNewFolder()}
                disabled={busyAction !== null || !newFolderName.trim()}
                className="rounded-full bg-alpha px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
                className="rounded-full border border-foreground/12 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              disabled={!serviceManager || busyAction !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/12 bg-foreground/5 px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07] disabled:opacity-50"
            >
              <FolderPlus className="size-4" aria-hidden />
              New Folder
            </button>
          )}
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

      {loading && totalNotebooks === 0 && subFolders.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm font-light text-text-secondary">
          <Loader2
            className="mr-2 size-5 animate-spin text-alpha"
            aria-hidden
          />
          Loading notebooks…
        </div>
      ) : null}

      {!loading &&
      totalNotebooks === 0 &&
      subFolders.length === 0 &&
      !combinedError ? (
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

      {rootFolder && rootFolder.notebooks.length > 0 ? (
        <div
          className={`rounded-3xl transition-colors ${
            dragOverFolder === "__root__"
              ? "ring-2 ring-alpha/50 bg-alpha/5"
              : ""
          }`}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          <NotebookTable
            notebooks={rootFolder.notebooks}
            caption="Notebooks at library root"
            {...tableProps}
          />
        </div>
      ) : (
        <div
          className={`rounded-3xl border-2 border-dashed transition-colors ${
            dragOverFolder === "__root__"
              ? "border-alpha/50 bg-alpha/5"
              : "border-transparent"
          }`}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          <div className="px-4 py-3" />
        </div>
      )}

      {subFolders.length > 0 ? (
        <div className="flex flex-col gap-4">
          {subFolders.map((folder) => {
            const isExpanded = expanded.has(folder.path);
            return (
              <div
                key={folder.path}
                className={`glass rounded-3xl transition-colors ${
                  dragOverFolder === folder.path
                    ? "ring-2 ring-alpha/50 bg-alpha/5"
                    : ""
                }`}
                onDragOver={(e) => handleFolderDragOver(e, folder.path)}
                onDragLeave={(e) => handleFolderDragLeave(e, folder.path)}
                onDrop={(e) => handleFolderDrop(e, folder.path)}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(folder.path)}
                    className="flex shrink-0 items-center justify-center rounded-full p-1 text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" aria-hidden />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden />
                    )}
                  </button>

                  <div
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                    onClick={() => toggleExpand(folder.path)}
                  >
                    <FolderOpen
                      className="size-4 shrink-0 text-alpha"
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium text-text-primary">
                      {folder.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-foreground/8 px-2 py-0.5 text-[10px] font-medium tabular-nums text-text-secondary">
                      {folder.notebooks.length}{" "}
                      {folder.notebooks.length === 1 ? "notebook" : "notebooks"}
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label={`Delete folder ${folder.name}`}
                    disabled={busyAction !== null}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-risk/40 hover:text-risk disabled:opacity-40"
                    onClick={() => void onDeleteFolder(folder.path)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>

                {isExpanded ? (
                  <div className="border-t border-foreground/6 px-2 pb-2">
                    {folder.notebooks.length > 0 ? (
                      <NotebookTable
                        notebooks={folder.notebooks}
                        caption={`Notebooks in ${folder.name}`}
                        {...tableProps}
                      />
                    ) : (
                      <p className="px-4 py-4 text-sm font-light text-text-secondary">
                        No notebooks in this folder yet.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
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
