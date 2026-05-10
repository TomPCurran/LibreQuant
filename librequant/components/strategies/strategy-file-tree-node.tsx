"use client";

import type { Contents } from "@jupyterlab/services";
import { useEffect, useState } from "react";

import { clientError } from "@/lib/client-log";
import { parentPath } from "@/lib/jupyter-paths";
import {
  createStrategyFile,
  createStrategySubfolder,
} from "@/lib/strategy-contents";
import type { StrategyFileItem } from "@/lib/types/strategy";

import { StrategyFileTreeDirectoryRow } from "./strategy-file-tree-directory-row";
import { StrategyFileTreeFileNode } from "./strategy-file-tree-file-node";
import { DRAG_MIME, isEditable } from "./strategy-file-tree-node-shared";
import { StrategyFileTreeNewItemBar } from "./strategy-file-tree-new-item-bar";
import type { NewItemRequest, RenameState } from "./strategy-file-tree-types";

export { DRAG_MIME, fileIcon, isEditable } from "./strategy-file-tree-node-shared";

export function FileTreeNode({
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
  const [busy, setBusy] = useState(false);

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

  const isRenaming = renaming?.path === item.path;

  if (item.type === "file") {
    return (
      <StrategyFileTreeFileNode
        item={item}
        activePath={activePath}
        depth={depth}
        renaming={renaming}
        renameValue={renameValue}
        onRenameChange={onRenameChange}
        onRenameCommit={onRenameCommit}
        onRenameCancel={onRenameCancel}
        onNavigate={onNavigate}
        onDelete={onDelete}
        onContextMenu={onContextMenu}
      />
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
      clientError("[strategy-file-tree]", e);
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
      <StrategyFileTreeDirectoryRow
        item={item}
        depth={depth}
        isOpen={isOpen}
        isRenaming={isRenaming}
        renameValue={renameValue}
        onRenameChange={onRenameChange}
        onRenameCommit={onRenameCommit}
        onRenameCancel={onRenameCancel}
        toggleExpanded={toggleExpanded}
        onDelete={onDelete}
        onContextMenu={onContextMenu}
        dragOver={dragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

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

          <StrategyFileTreeNewItemBar
            depth={depth}
            newMode={newMode}
            setNewMode={setNewMode}
            newName={newName}
            setNewName={setNewName}
            busy={busy}
            onAdd={onAdd}
          />
        </div>
      ) : null}
    </div>
  );
}
