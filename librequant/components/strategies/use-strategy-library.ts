"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import {
  buildImportSnippet,
  createStrategyDirectory,
  createStrategyFile,
  deleteStrategyDirectory,
  deleteStrategyFile,
  listStrategyDirectories,
} from "@/lib/strategy-contents";
import type { StrategyDirectoryItem } from "@/lib/types/strategy";

import type { StrategyDeleteDialogState } from "./strategy-delete-dialog";

export function useStrategyLibrary() {
  const router = useRouter();
  const { serviceManager, error: mgrError } = useJupyterServiceManager();
  const [items, setItems] = useState<StrategyDirectoryItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newStrategyName, setNewStrategyName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFileDir, setNewFileDir] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] =
    useState<StrategyDeleteDialogState>(null);

  const refresh = useCallback(async () => {
    if (!serviceManager) return;
    setListError(null);
    setLoading(true);
    try {
      const list = await listStrategyDirectories(serviceManager.contents);
      setItems(list);
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Failed to list strategies.",
      );
    } finally {
      setLoading(false);
    }
  }, [serviceManager]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const onCreateStrategy = useCallback(async () => {
    if (!serviceManager || !newStrategyName.trim()) return;
    setBusyAction("new");
    try {
      const dirPath = await createStrategyDirectory(
        serviceManager.contents,
        newStrategyName,
      );
      setNewStrategyName("");
      setShowNewForm(false);
      await refresh();
      setExpanded((prev) => new Set(prev).add(dirPath));
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Could not create strategy.",
      );
    } finally {
      setBusyAction(null);
    }
  }, [serviceManager, newStrategyName, refresh]);

  const onAddFile = useCallback(
    async (dirPath: string) => {
      if (!serviceManager || !newFileName.trim()) return;
      setBusyAction("add-file");
      try {
        await createStrategyFile(
          serviceManager.contents,
          dirPath,
          newFileName,
        );
        setNewFileName("");
        setNewFileDir(null);
        await refresh();
      } catch (e) {
        setListError(
          e instanceof Error ? e.message : "Could not create file.",
        );
      } finally {
        setBusyAction(null);
      }
    },
    [serviceManager, newFileName, refresh],
  );

  const onDeleteDir = useCallback((dirPath: string) => {
    setDeleteDialog({ kind: "dir", path: dirPath });
  }, []);

  const onDeleteFile = useCallback((filePath: string) => {
    setDeleteDialog({ kind: "file", path: filePath });
  }, []);

  const runPendingDelete = useCallback(async () => {
    if (!serviceManager || !deleteDialog) return;
    setBusyAction("delete");
    try {
      if (deleteDialog.kind === "dir") {
        await deleteStrategyDirectory(serviceManager.contents, deleteDialog.path);
      } else {
        await deleteStrategyFile(serviceManager.contents, deleteDialog.path);
      }
      await refresh();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyAction(null);
      setDeleteDialog(null);
    }
  }, [serviceManager, deleteDialog, refresh]);

  const onCopyImport = useCallback(async (filePath: string) => {
    const snippet = buildImportSnippet(filePath);
    await navigator.clipboard.writeText(snippet);
    setCopiedPath(filePath);
    setTimeout(() => setCopiedPath(null), 2000);
  }, []);

  const onOpenFile = useCallback(
    (filePath: string) => {
      router.push(`/strategies/edit?path=${encodeURIComponent(filePath)}`);
    },
    [router],
  );

  return {
    serviceManager,
    mgrError,
    items,
    listError,
    loading,
    busyAction,
    expanded,
    newStrategyName,
    setNewStrategyName,
    showNewForm,
    setShowNewForm,
    newFileDir,
    setNewFileDir,
    newFileName,
    setNewFileName,
    copiedPath,
    deleteDialog,
    setDeleteDialog,
    refresh,
    toggleExpand,
    onCreateStrategy,
    onAddFile,
    onDeleteDir,
    onDeleteFile,
    runPendingDelete,
    onCopyImport,
    onOpenFile,
  };
}
