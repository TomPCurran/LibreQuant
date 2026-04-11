"use client";

import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardPaste,
  Copy,
  FileCode2,
  FilePlus,
  FileJson,
  Folder,
  FolderOpen,
  FolderPlus,
  Link,
  Pencil,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Contents } from "@jupyterlab/services";
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
import type { StrategyFileItem } from "@/lib/types/strategy";
import { basenameFromPath, joinJupyterPath, parentPath } from "@/lib/jupyter-paths";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StrategyFileTreeProps {
  dirPath: string;
  files: StrategyFileItem[];
  activePath: string;
  contents: Contents.IManager;
  onRefresh: () => void;
}

type ContextMenuState = {
  x: number;
  y: number;
  path: string;
  type: "file" | "directory";
  name: string;
} | null;

type ClipboardItem = {
  path: string;
  name: string;
} | null;

type NewItemRequest = {
  parentPath: string;
  mode: "file" | "folder";
} | null;

type RenameState = {
  path: string;
  currentName: string;
} | null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fileIcon(name: string) {
  if (name.endsWith(".py"))
    return <FileCode2 className="size-4 shrink-0 text-alpha" aria-hidden />;
  if (name.endsWith(".json"))
    return <FileJson className="size-4 shrink-0 text-amber-500" aria-hidden />;
  return <FileCode2 className="size-4 shrink-0 text-text-secondary" aria-hidden />;
}

function isEditable(item: StrategyFileItem): boolean {
  return (
    item.type === "directory" ||
    item.name.endsWith(".py") ||
    item.name.endsWith(".json")
  );
}

const DRAG_MIME = "application/x-strategy-file-path";

/* ------------------------------------------------------------------ */
/*  Context menu                                                       */
/* ------------------------------------------------------------------ */

function TreeContextMenu({
  menu,
  clipboard,
  onCopy,
  onPaste,
  onCopyPath,
  onRename,
  onNewFile,
  onNewFolder,
  onDelete,
  onClose,
}: {
  menu: NonNullable<ContextMenuState>;
  clipboard: ClipboardItem;
  onCopy: () => void;
  onPaste: () => void;
  onCopyPath: () => void;
  onRename: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium transition hover:bg-foreground/8";

  const canPaste = clipboard !== null;

  return (
    <div
      ref={ref}
      className="absolute z-50 min-w-[160px] rounded-xl border border-foreground/10 bg-background/95 py-1 shadow-xl backdrop-blur-xl"
      style={{ top: menu.y, left: menu.x }}
    >
      <button type="button" onClick={onNewFile} className={itemClass}>
        <FilePlus className="size-3.5 text-text-secondary" aria-hidden />
        <span className="text-text-primary">New file</span>
      </button>
      <button type="button" onClick={onNewFolder} className={itemClass}>
        <FolderPlus className="size-3.5 text-text-secondary" aria-hidden />
        <span className="text-text-primary">New folder</span>
      </button>

      <div className="my-1 border-t border-foreground/8" />

      {menu.type === "file" ? (
        <button type="button" onClick={onCopy} className={itemClass}>
          <Copy className="size-3.5 text-text-secondary" aria-hidden />
          <span className="text-text-primary">Copy</span>
        </button>
      ) : null}

      {canPaste ? (
        <button type="button" onClick={onPaste} className={itemClass}>
          <ClipboardPaste className="size-3.5 text-text-secondary" aria-hidden />
          <span className="text-text-primary">Paste</span>
        </button>
      ) : null}

      <button type="button" onClick={onCopyPath} className={itemClass}>
        <Link className="size-3.5 text-text-secondary" aria-hidden />
        <span className="text-text-primary">Copy path</span>
      </button>

      <div className="my-1 border-t border-foreground/8" />

      <button type="button" onClick={onRename} className={itemClass}>
        <Pencil className="size-3.5 text-text-secondary" aria-hidden />
        <span className="text-text-primary">Rename</span>
      </button>

      <button type="button" onClick={onDelete} className={itemClass}>
        <Trash2 className="size-3.5 text-risk" aria-hidden />
        <span className="text-risk">Delete</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FileTreeNode (recursive)                                           */
/* ------------------------------------------------------------------ */

function FileTreeNode({
  item,
  activePath,
  depth,
  expanded,
  toggleExpanded,
  onNavigate,
  onDelete,
  onContextMenu,
  onMoveFile,
  renaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  newItemRequest,
  clearNewItemRequest,
  contents,
  onRefresh,
}: {
  item: StrategyFileItem;
  activePath: string;
  depth: number;
  expanded: Set<string>;
  toggleExpanded: (path: string) => void;
  onNavigate: (path: string) => void;
  onDelete: (path: string, type: "file" | "directory") => void;
  onContextMenu: (e: React.MouseEvent, item: StrategyFileItem) => void;
  onMoveFile: (srcPath: string, destDirPath: string) => void;
  renaming: RenameState;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  newItemRequest: NewItemRequest;
  clearNewItemRequest: () => void;
  contents: Contents.IManager;
  onRefresh: () => void;
}) {
  const [newMode, setNewMode] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (
      item.type === "directory" &&
      newItemRequest &&
      newItemRequest.parentPath === item.path
    ) {
      setNewMode(newItemRequest.mode === "folder" ? "folder" : "file");
      setNewName("");
      clearNewItemRequest();
    }
  }, [item.type, item.path, newItemRequest, clearNewItemRequest]);
  const [busy, setBusy] = useState(false);

  const isRenaming = renaming?.path === item.path;

  if (item.type === "file") {
    const isActive = item.path === activePath;
    return (
      <div
        className="group flex items-center"
        draggable={!isRenaming}
        onDragStart={(e) => {
          if (isRenaming) { e.preventDefault(); return; }
          e.dataTransfer.setData(DRAG_MIME, item.path);
          e.dataTransfer.effectAllowed = "move";
        }}
        onContextMenu={(e) => onContextMenu(e, item)}
      >
        {isRenaming ? (
          <div
            className="flex min-w-0 flex-1 items-center gap-2 py-1 pr-1"
            style={{ paddingLeft: `${depth * 12 + 10}px` }}
          >
            {fileIcon(item.name)}
            <input
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onRenameCommit();
                }
                if (e.key === "Escape") onRenameCancel();
              }}
              onBlur={() => void onRenameCommit()}
              className="min-w-0 flex-1 rounded border border-alpha/40 bg-background/80 px-1.5 py-0.5 font-mono-code text-[12px] text-text-primary outline-none ring-alpha/30 focus:ring-2"
              autoFocus
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate(item.path)}
            style={{ paddingLeft: `${depth * 12 + 10}px` }}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 pr-1 text-left text-[13px] transition ${
              isActive
                ? "bg-alpha/10 font-medium text-alpha"
                : "font-light text-text-secondary hover:bg-foreground/5 hover:text-text-primary"
            }`}
          >
            {fileIcon(item.name)}
            <span className="truncate font-mono-code text-[12px]">
              {item.name}
            </span>
          </button>
        )}
        {!isRenaming ? (
          <button
            type="button"
            aria-label={`Delete ${item.name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(item.path, "file"); }}
            className="mr-1 shrink-0 rounded p-1 text-text-secondary opacity-0 transition hover:text-risk group-hover:opacity-100"
          >
            <Trash2 className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  }

  const isOpen = expanded.has(item.path);
  const children = (item.children ?? []).filter(isEditable);

  const onAdd = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      if (newMode === "folder") {
        await createStrategySubfolder(contents, item.path, newName);
      } else {
        await createStrategyFile(contents, item.path, newName);
      }
      setNewMode(null);
      setNewName("");
      onRefresh();
    } catch (e) {
      console.error("[strategy-file-tree]", e);
    } finally {
      setBusy(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    setDragOver(false);
    const srcPath = e.dataTransfer.getData(DRAG_MIME);
    if (!srcPath) return;
    e.preventDefault();
    if (parentPath(srcPath) === item.path) return;
    onMoveFile(srcPath, item.path);
  };

  return (
    <div>
      <div
        className={`group flex items-center ${dragOver ? "rounded-lg bg-alpha/15" : ""}`}
        onContextMenu={(e) => onContextMenu(e, item)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isRenaming ? (
          <div
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-1"
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            {isOpen ? (
              <ChevronDown className="size-3 shrink-0 text-text-secondary" aria-hidden />
            ) : (
              <ChevronRight className="size-3 shrink-0 text-text-secondary" aria-hidden />
            )}
            {isOpen ? (
              <FolderOpen className="size-3.5 shrink-0 text-alpha/70" aria-hidden />
            ) : (
              <Folder className="size-3.5 shrink-0 text-alpha/70" aria-hidden />
            )}
            <input
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onRenameCommit();
                }
                if (e.key === "Escape") onRenameCancel();
              }}
              onBlur={() => void onRenameCommit()}
              className="min-w-0 flex-1 rounded border border-alpha/40 bg-background/80 px-1.5 py-0.5 text-[12px] font-medium text-text-primary outline-none ring-alpha/30 focus:ring-2"
              autoFocus
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => toggleExpanded(item.path)}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1.5 pr-1 text-left transition hover:bg-foreground/5"
          >
            {isOpen ? (
              <ChevronDown className="size-3 shrink-0 text-text-secondary" aria-hidden />
            ) : (
              <ChevronRight className="size-3 shrink-0 text-text-secondary" aria-hidden />
            )}
            {isOpen ? (
              <FolderOpen className="size-3.5 shrink-0 text-alpha/70" aria-hidden />
            ) : (
              <Folder className="size-3.5 shrink-0 text-alpha/70" aria-hidden />
            )}
            <span className="truncate text-[12px] font-medium text-text-primary">
              {item.name}
            </span>
          </button>
        )}
        {!isRenaming ? (
          <button
            type="button"
            aria-label={`Delete ${item.name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(item.path, "directory"); }}
            className="mr-1 shrink-0 rounded p-1 text-text-secondary opacity-0 transition hover:text-risk group-hover:opacity-100"
          >
            <Trash2 className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div>
          {children.map((child) => (
            <FileTreeNode
              key={child.path}
              item={child}
              activePath={activePath}
              depth={depth + 1}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onNavigate={onNavigate}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              onMoveFile={onMoveFile}
              renaming={renaming}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              newItemRequest={newItemRequest}
              clearNewItemRequest={clearNewItemRequest}
              contents={contents}
              onRefresh={onRefresh}
            />
          ))}

          {newMode ? (
            <div
              className="flex flex-col gap-1 px-1 py-1"
              style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={newMode === "folder" ? "folder_name" : "module.py"}
                className="w-full rounded-lg border border-foreground/12 bg-background/80 px-2 py-1 text-xs font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
                aria-label={newMode === "folder" ? "New folder name" : "New file name"}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onAdd();
                  if (e.key === "Escape") {
                    setNewMode(null);
                    setNewName("");
                  }
                }}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => void onAdd()}
                  disabled={busy || !newName.trim()}
                  className="flex-1 rounded-lg bg-alpha px-2 py-0.5 text-[10px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="mx-auto size-3 animate-spin" aria-hidden />
                  ) : (
                    "Add"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setNewMode(null); setNewName(""); }}
                  className="flex-1 rounded-lg border border-foreground/12 px-2 py-0.5 text-[10px] font-medium text-text-secondary transition hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 px-1 py-0.5"
              style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
            >
              <button
                type="button"
                onClick={() => setNewMode("file")}
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
              >
                <Plus className="size-3" aria-hidden />
                File
              </button>
              <button
                type="button"
                onClick={() => setNewMode("folder")}
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
              >
                <FolderPlus className="size-3" aria-hidden />
                Folder
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StrategyFileTree (root)                                            */
/* ------------------------------------------------------------------ */

export function StrategyFileTree({
  dirPath,
  files,
  activePath,
  contents,
  onRefresh,
}: StrategyFileTreeProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [newMode, setNewMode] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [clipboard, setClipboard] = useState<ClipboardItem>(null);
  const [newItemRequest, setNewItemRequest] = useState<NewItemRequest>(null);
  const [renaming, setRenaming] = useState<RenameState>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameCommitInFlightRef = useRef(false);
  const dirName = basenameFromPath(dirPath);

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
      console.error("[strategy-file-tree]", e);
    } finally {
      setBusy(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = useCallback(
    async (path: string, type: "file" | "directory") => {
      const label = type === "directory" ? "folder and all its contents" : "file";
      if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
      try {
        if (type === "directory") {
          await deleteStrategyDirectory(contents, path);
        } else {
          await deleteStrategyFile(contents, path);
        }
        onRefresh();
      } catch (e) {
        console.error("[strategy-file-tree]", e);
      }
    },
    [contents, onRefresh],
  );

  /* ---- Context menu ---- */
  const openContextMenu = useCallback(
    (e: React.MouseEvent, item: StrategyFileItem) => {
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
      console.error("[strategy-file-tree]", e);
    }
  }, [contextMenu, clipboard, contents, onRefresh, closeMenu]);

  const handleCopyPath = useCallback(() => {
    if (!contextMenu) return;
    void navigator.clipboard.writeText(contextMenu.path);
    closeMenu();
  }, [contextMenu, closeMenu]);

  const handleContextDelete = useCallback(() => {
    if (!contextMenu) return;
    closeMenu();
    void handleDelete(contextMenu.path, contextMenu.type);
  }, [contextMenu, closeMenu, handleDelete]);

  /* ---- Rename ---- */
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
      console.error("[strategy-file-tree]", e);
    } finally {
      renameCommitInFlightRef.current = false;
      setRenaming(null);
    }
  }, [renaming, renameValue, contents, onRefresh]);

  const cancelRename = useCallback(() => setRenaming(null), []);

  /* ---- Drag and drop ---- */
  const [rootDragOver, setRootDragOver] = useState(false);

  const handleMoveFile = useCallback(
    (srcPath: string, destDirPath: string) => {
      void (async () => {
        try {
          await moveStrategyFile(contents, srcPath, destDirPath);
          onRefresh();
        } catch (e) {
          console.error("[strategy-file-tree]", e);
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

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col border-r border-foreground/8 bg-background/60"
    >
      <div className="flex items-center gap-2 border-b border-foreground/8 px-3 py-3">
        <FolderOpen className="size-4 shrink-0 text-alpha" aria-hidden />
        <span className="truncate text-xs font-semibold uppercase tracking-widest text-text-secondary">
          {dirName}
        </span>
        {clipboard ? (
          <span title="File copied">
            <Clipboard className="ml-auto size-3 shrink-0 text-alpha/60" aria-hidden />
          </span>
        ) : null}
      </div>

      <nav
        className={`flex-1 overflow-y-auto px-1 py-1 ${rootDragOver ? "bg-alpha/5" : ""}`}
        aria-label="Strategy files"
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {editableItems.map((item) =>
          item.type === "directory" ? (
            <FileTreeNode
              key={item.path}
              item={item}
              activePath={activePath}
              depth={0}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onNavigate={onNavigate}
              onDelete={handleDelete}
              onContextMenu={openContextMenu}
              onMoveFile={handleMoveFile}
              renaming={renaming}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameCommit={() => void commitRename()}
              onRenameCancel={cancelRename}
              newItemRequest={newItemRequest}
              clearNewItemRequest={clearNewItemRequest}
              contents={contents}
              onRefresh={onRefresh}
            />
          ) : (
            (() => {
              const isRenamingThis = renaming?.path === item.path;
              return (
                <div
                  key={item.path}
                  className="group flex items-center"
                  draggable={!isRenamingThis}
                  onDragStart={(e) => {
                    if (isRenamingThis) { e.preventDefault(); return; }
                    e.dataTransfer.setData(DRAG_MIME, item.path);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onContextMenu={(e) => openContextMenu(e, item)}
                >
                  {isRenamingThis ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1 pr-1">
                      {fileIcon(item.name)}
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void commitRename();
                          }
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={() => void commitRename()}
                        className="min-w-0 flex-1 rounded border border-alpha/40 bg-background/80 px-1.5 py-0.5 font-mono-code text-[12px] text-text-primary outline-none ring-alpha/30 focus:ring-2"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate(item.path)}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 pr-1 text-left text-[13px] transition ${
                        item.path === activePath
                          ? "bg-alpha/10 font-medium text-alpha"
                          : "font-light text-text-secondary hover:bg-foreground/5 hover:text-text-primary"
                      }`}
                    >
                      {fileIcon(item.name)}
                      <span className="truncate font-mono-code text-[12px]">
                        {item.name}
                      </span>
                    </button>
                  )}
                  {!isRenamingThis ? (
                    <button
                      type="button"
                      aria-label={`Delete ${item.name}`}
                      onClick={(e) => { e.stopPropagation(); void handleDelete(item.path, "file"); }}
                      className="mr-1 shrink-0 rounded p-1 text-text-secondary opacity-0 transition hover:text-risk group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </div>
              );
            })()
          ),
        )}
      </nav>

      <div className="border-t border-foreground/8 px-2 py-2">
        {newMode ? (
          <div className="flex flex-col gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={newMode === "folder" ? "folder_name" : "module.py"}
              className="w-full rounded-lg border border-foreground/12 bg-background/80 px-2.5 py-1.5 text-xs font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
              aria-label={newMode === "folder" ? "New folder name" : "New file name"}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void onAdd();
                if (e.key === "Escape") {
                  setNewMode(null);
                  setNewName("");
                }
              }}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => void onAdd()}
                disabled={busy || !newName.trim()}
                className="flex-1 rounded-lg bg-alpha px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2
                    className="mx-auto size-3 animate-spin"
                    aria-hidden
                  />
                ) : (
                  "Add"
                )}
              </button>
              <button
                type="button"
                onClick={() => { setNewMode(null); setNewName(""); }}
                className="flex-1 rounded-lg border border-foreground/12 px-2 py-1 text-xs font-medium text-text-secondary transition hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => setNewMode("file")}
              className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
            >
              <Plus className="size-3.5" aria-hidden />
              New file
            </button>
            <button
              type="button"
              onClick={() => setNewMode("folder")}
              className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
            >
              <FolderPlus className="size-3.5" aria-hidden />
              New folder
            </button>
          </div>
        )}
      </div>

      {contextMenu ? (
        <TreeContextMenu
          menu={contextMenu}
          clipboard={clipboard}
          onCopy={handleCopy}
          onPaste={() => void handlePaste()}
          onCopyPath={handleCopyPath}
          onRename={handleContextRename}
          onNewFile={handleContextNewFile}
          onNewFolder={handleContextNewFolder}
          onDelete={handleContextDelete}
          onClose={closeMenu}
        />
      ) : null}
    </div>
  );
}
