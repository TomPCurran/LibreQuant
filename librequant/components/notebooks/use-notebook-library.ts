"use client";

import type { INotebookContent } from "@jupyterlab/nbformat";
import type { ServiceManager } from "@jupyterlab/services";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
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
import { initialNotebook } from "@/lib/initial-notebook";
import { isNotebookContent } from "@/lib/notebook-local-storage";
import { notebookStemFromPath } from "@/lib/jupyter-paths";
import type { NotebookFolderItem } from "@/lib/types/notebook";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";

import type { NotebookDeleteTarget } from "./notebook-delete-dialog";
import { NOTEBOOK_LIBRARY_DRAG_MIME } from "./notebook-library-dnd";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function useNotebookLibrary(
  libraryRoot: string,
  serviceManager: ServiceManager.IManager | null,
) {
  const [folders, setFolders] = useState<NotebookFolderItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return {
    folders,
    setFolders,
    listError,
    setListError,
    loading,
    refresh,
  };
}

export function useNotebookLibraryPanel() {
  const router = useRouter();
  const libraryRoot = getNotebookLibraryRoot();
  const { serviceManager, error: mgrError } = useJupyterServiceManager();
  const {
    folders,
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

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleFolderDragOver = (e: DragEvent, folderPath: string) => {
    if (e.dataTransfer.types.includes(NOTEBOOK_LIBRARY_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder(folderPath);
    }
  };

  const handleFolderDragLeave = (e: DragEvent, folderPath: string) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    if (dragOverFolder === folderPath) setDragOverFolder(null);
  };

  const handleFolderDrop = (e: DragEvent, folderPath: string) => {
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

  const handleRootDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(NOTEBOOK_LIBRARY_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder("__root__");
    }
  };

  const handleRootDragLeave = (e: DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    if (dragOverFolder === "__root__") setDragOverFolder(null);
  };

  const handleRootDrop = (e: DragEvent) => {
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

  return {
    libraryRoot,
    serviceManager,
    mgrError,
    folders,
    listError,
    setListError,
    loading,
    refresh,
    busyAction,
    renamePath,
    renameValue,
    showNewFolder,
    setShowNewFolder,
    newFolderName,
    setNewFolderName,
    expanded,
    dragOverFolder,
    deleteTarget,
    setDeleteTarget,
    fileInputRef,
    totalNotebooks,
    combinedError,
    rootFolder,
    subFolders,
    onNewNotebook,
    onNewFolder,
    onUploadClick,
    onFileChange,
    tableProps,
    handleFolderDragOver,
    handleFolderDragLeave,
    handleFolderDrop,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
    toggleExpand,
    requestDeleteFolder,
    runPendingDelete,
  };
}
