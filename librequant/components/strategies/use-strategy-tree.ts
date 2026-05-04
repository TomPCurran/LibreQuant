"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createStrategyFile,
  createStrategySubfolder,
  deleteStrategyDirectory,
  deleteStrategyFile,
  getTextFileContent,
  moveStrategyFile,
  renameStrategyItem,
  saveTextFileContent,
} from "@/lib/strategy-contents";
import { basenameFromPath, joinJupyterPath, parentPath } from "@/lib/jupyter-paths";
import { clientError } from "@/lib/client-log";

import { DRAG_MIME, isEditable } from "./strategy-file-tree-node";
import type {
  NewItemRequest,
  RenameState,
  StrategyClipboardItem,
  StrategyContextMenuState,
  StrategyFileTreeProps,
} from "./strategy-file-tree-types";

export function useStrategyTree({
  dirPath,
  files,
  activePath: _activePath,
  contents,
  onRefresh,
}: StrategyFileTreeProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [newMode, setNewMode] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState<StrategyContextMenuState | null>(
    null,
  );
  const [clipboard, setClipboard] = useState<StrategyClipboardItem>(null);
  const [newItemRequest, setNewItemRequest] = useState<NewItemRequest>(null);
  const [renaming, setRenaming] = useState<RenameState>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameCommitInFlightRef = useRef(false);
  const dirName = basenameFromPath(dirPath);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    path: string;
    type: "file" | "directory";
  } | null>(null);

  useEffect(() => {
    if (newItemRequest && newItemRequest.parentPath === dirPath) {
      setNewMode(newItemRequest.mode === "folder" ? "folder" : "file");
      setNewName("");
      setNewItemRequest(null);
    }
  }, [newItemRequest, dirPath]);

  const editableItems = files.filter(isEditable);

  const onNavigate = (filePath: string) => {
    router.push(`/strategies/edit?path=${encodeURIComponent(filePath)}`);
  };

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const onAdd = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      if (newMode === "folder") {
        await createStrategySubfolder(contents, dirPath, newName);
        onRefresh();
      } else {
        const path = await createStrategyFile(contents, dirPath, newName);
        onRefresh();
        router.push(`/strategies/edit?path=${encodeURIComponent(path)}`);
      }
      setNewMode(null);
      setNewName("");
    } catch (e) {
      clientError("[strategy-file-tree]", e);
    } finally {
      setBusy(false);
    }
  };

  const runDelete = useCallback(
    async (path: string, type: "file" | "directory") => {
      try {
        if (type === "directory") {
          await deleteStrategyDirectory(contents, path);
        } else {
          await deleteStrategyFile(contents, path);
        }
        onRefresh();
      } catch (e) {
        clientError("[strategy-file-tree]", e);
      }
    },
    [contents, onRefresh],
  );

  const requestDelete = useCallback((path: string, type: "file" | "directory") => {
    setDeleteConfirm({ path, type });
  }, []);

  const openContextMenu = useCallback(
    (e: React.MouseEvent, item: import("@/lib/types/strategy").StrategyFileItem) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX;
      const y = rect ? e.clientY - rect.top : e.clientY;
      setContextMenu({ x, y, path: item.path, type: item.type, name: item.name });
    },
    [],
  );

  const closeMenu = useCallback(() => setContextMenu(null), []);
  const clearNewItemRequest = useCallback(() => setNewItemRequest(null), []);

  const handleCopy = useCallback(() => {
    if (!contextMenu) return;
    setClipboard({ path: contextMenu.path, name: contextMenu.name });
    closeMenu();
  }, [contextMenu, closeMenu]);

  const handlePaste = useCallback(async () => {
    if (!contextMenu || !clipboard) return;
    closeMenu();
    try {
      const targetDir =
        contextMenu.type === "directory"
          ? contextMenu.path
          : parentPath(contextMenu.path);
      const src = await getTextFileContent(contents, clipboard.path);
      const destName = `copy_of_${clipboard.name}`;
      const destPath = joinJupyterPath(targetDir, destName);
      await saveTextFileContent(contents, destPath, src);
      onRefresh();
    } catch (e) {
      clientError("[strategy-file-tree]", e);
    }
  }, [contextMenu, clipboard, contents, onRefresh, closeMenu]);

  const handleCopyPath = useCallback(() => {
    if (!contextMenu) return;
    void navigator.clipboard.writeText(contextMenu.path);
    closeMenu();
  }, [contextMenu, closeMenu]);

  const handleContextDelete = useCallback(() => {
    if (!contextMenu) return;
    const { path, type } = contextMenu;
    closeMenu();
    requestDelete(path, type);
  }, [contextMenu, closeMenu, requestDelete]);

  const handleContextRename = useCallback(() => {
    if (!contextMenu) return;
    closeMenu();
    setRenaming({ path: contextMenu.path, currentName: contextMenu.name });
    setRenameValue(contextMenu.name);
  }, [contextMenu, closeMenu]);

  const commitRename = useCallback(async () => {
    if (renameCommitInFlightRef.current) return;
    if (!renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renaming.currentName) {
      setRenaming(null);
      return;
    }
    renameCommitInFlightRef.current = true;
    try {
      await renameStrategyItem(contents, renaming.path, trimmed);
      onRefresh();
    } catch (e) {
      clientError("[strategy-file-tree]", e);
    } finally {
      renameCommitInFlightRef.current = false;
      setRenaming(null);
    }
  }, [renaming, renameValue, contents, onRefresh]);

  const cancelRename = useCallback(() => setRenaming(null), []);

  const [rootDragOver, setRootDragOver] = useState(false);

  const handleMoveFile = useCallback(
    (srcPath: string, destDirPath: string) => {
      void (async () => {
        try {
          await moveStrategyFile(contents, srcPath, destDirPath);
          onRefresh();
        } catch (e) {
          clientError("[strategy-file-tree]", e);
        }
      })();
    },
    [contents, onRefresh],
  );

  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setRootDragOver(true);
  }, []);

  const handleRootDragLeave = useCallback(() => setRootDragOver(false), []);

  const handleRootDrop = useCallback(
    (e: React.DragEvent) => {
      setRootDragOver(false);
      const srcPath = e.dataTransfer.getData(DRAG_MIME);
      if (!srcPath) return;
      e.preventDefault();
      if (parentPath(srcPath) === dirPath) return;
      handleMoveFile(srcPath, dirPath);
    },
    [dirPath, handleMoveFile],
  );

  const handleContextNewFile = useCallback(() => {
    if (!contextMenu) return;
    const targetDir =
      contextMenu.type === "directory"
        ? contextMenu.path
        : parentPath(contextMenu.path);
    closeMenu();
    setExpanded((prev) => new Set(prev).add(targetDir));
    setNewItemRequest({ parentPath: targetDir, mode: "file" });
  }, [contextMenu, closeMenu]);

  const handleContextNewFolder = useCallback(() => {
    if (!contextMenu) return;
    const targetDir =
      contextMenu.type === "directory"
        ? contextMenu.path
        : parentPath(contextMenu.path);
    closeMenu();
    setExpanded((prev) => new Set(prev).add(targetDir));
    setNewItemRequest({ parentPath: targetDir, mode: "folder" });
  }, [contextMenu, closeMenu]);

  const deleteTitle =
    deleteConfirm?.type === "directory"
      ? "Delete folder?"
      : "Delete file?";
  const deleteMessage =
    deleteConfirm?.type === "directory"
      ? "This will remove the folder and all its contents. This cannot be undone."
      : "This file will be removed. This cannot be undone.";

  return {
    containerRef,
    expanded,
    newMode,
    setNewMode,
    newName,
    setNewName,
    busy,
    contextMenu,
    clipboard,
    newItemRequest,
    renaming,
    renameValue,
    setRenameValue,
    dirName,
    deleteConfirm,
    setDeleteConfirm,
    editableItems,
    onNavigate,
    toggleExpanded,
    onAdd,
    runDelete,
    requestDelete,
    openContextMenu,
    closeMenu,
    clearNewItemRequest,
    handleCopy,
    handlePaste,
    handleCopyPath,
    handleContextDelete,
    handleContextRename,
    commitRename,
    cancelRename,
    rootDragOver,
    handleMoveFile,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
    handleContextNewFile,
    handleContextNewFolder,
    deleteTitle,
    deleteMessage,
  };
}
