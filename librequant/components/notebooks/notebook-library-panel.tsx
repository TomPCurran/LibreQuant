"use client";

import type { INotebookContent } from "@jupyterlab/nbformat";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Loader2,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { getNotebookLibraryRoot } from "@/lib/env";
import {
  createNotebookFolder,
  createUntitledNotebook,
  deleteNotebookPath,
  moveNotebookToFolder,
  renameNotebookPath,
  uploadNotebookFile,
} from "@/lib/jupyter-contents";
import type { NotebookFolderItem, NotebookListItem } from "@/lib/types/notebook";
import { initialNotebook } from "@/lib/initial-notebook";
import { isNotebookContent } from "@/lib/notebook-local-storage";
import { notebookStemFromPath } from "@/lib/jupyter-paths";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";

import {
  NotebookDeleteDialog,
  type NotebookDeleteTarget,
} from "./notebook-delete-dialog";
import { NotebookLibraryToolbar } from "./notebook-library-toolbar";
import {
  NotebookTable,
  NOTEBOOK_LIBRARY_DRAG_MIME,
} from "./notebook-library-table";
import { useNotebookLibrary } from "./use-notebook-library";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function NotebookLibraryPanel() {
  const router = useRouter();
  const libraryRoot = getNotebookLibraryRoot();
  const { serviceManager, error: mgrError } = useJupyterServiceManager();
  const {
    folders,
    setFolders,
    listError,
    setListError,
    loading,
    refresh,
  } = useNotebookLibrary(libraryRoot, serviceManager);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotebookDeleteTarget>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renamePathRef = useRef(renamePath);
  const renameValueRef = useRef(renameValue);
  renamePathRef.current = renamePath;
  renameValueRef.current = renameValue;

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
  }, [serviceManager, libraryRoot, refresh, router, setListError]);

  const requestDeleteNotebook = useCallback((path: string) => {
    setDeleteTarget({ kind: "notebook", path });
  }, []);

  const requestDeleteFolder = useCallback((folderPath: string) => {
    setDeleteTarget({ kind: "folder", path: folderPath });
  }, []);

  const runPendingDelete = useCallback(async () => {
    if (!serviceManager || !deleteTarget) return;
    setBusyAction("delete");
    try {
      await deleteNotebookPath(
        serviceManager.contents,
        libraryRoot,
        deleteTarget.path,
      );
      await refresh();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyAction(null);
      setDeleteTarget(null);
    }
  }, [serviceManager, libraryRoot, refresh, deleteTarget, setListError]);

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
    [serviceManager, libraryRoot, refresh, setListError],
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
    [serviceManager, libraryRoot, refresh, setListError],
  );

  const handleFolderDragOver = (e: React.DragEvent, folderPath: string) => {
    if (e.dataTransfer.types.includes(NOTEBOOK_LIBRARY_DRAG_MIME)) {
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
    const notebookPath = e.dataTransfer.getData(NOTEBOOK_LIBRARY_DRAG_MIME);
    if (!notebookPath) return;
    const parentDir = notebookPath.substring(
      0,
      notebookPath.lastIndexOf("/"),
    );
    if (parentDir === folderPath) return;
    void onMoveToFolder(notebookPath, folderPath);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(NOTEBOOK_LIBRARY_DRAG_MIME)) {
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
    const notebookPath = e.dataTransfer.getData(NOTEBOOK_LIBRARY_DRAG_MIME);
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
    (path: string) => {
      requestDeleteNotebook(path);
    },
    [requestDeleteNotebook],
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
      <NotebookLibraryToolbar
        libraryRoot={libraryRoot}
        serviceManager={serviceManager}
        busyAction={busyAction}
        showNewFolder={showNewFolder}
        setShowNewFolder={setShowNewFolder}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        onNewNotebook={onNewNotebook}
        onNewFolder={onNewFolder}
        onUploadClick={onUploadClick}
        fileInputRef={fileInputRef}
        onFileChange={onFileChange}
      />

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
                    onClick={() => requestDeleteFolder(folder.path)}
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

      <NotebookDeleteDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void runPendingDelete()}
      />
    </div>
  );
}
