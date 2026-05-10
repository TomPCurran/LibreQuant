"use client";

import { Clipboard, FolderOpen, Trash2 } from "lucide-react";

import { StrategyConfirmDialog } from "./strategy-confirm-dialog";
import { DRAG_MIME, FileTreeNode, fileIcon } from "./strategy-file-tree-node";
import type { StrategyFileTreeProps } from "./strategy-file-tree-types";
import { StrategyTreeContextMenu } from "./strategy-tree-context-menu";
import { StrategyTreeFooter } from "./strategy-tree-actions";
import { useStrategyTree } from "./use-strategy-tree";

export type { StrategyFileTreeProps } from "./strategy-file-tree-types";

export function StrategyFileTree(props: StrategyFileTreeProps) {
  const {
    containerRef,
    dirName,
    clipboard,
    rootDragOver,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
    editableItems,
    expanded,
    toggleExpanded,
    onNavigate,
    requestDelete,
    openContextMenu,
    handleMoveFile,
    renaming,
    renameValue,
    setRenameValue,
    commitRename,
    cancelRename,
    newItemRequest,
    clearNewItemRequest,
    newMode,
    setNewMode,
    newName,
    setNewName,
    busy,
    onAdd,
    contextMenu,
    handleCopy,
    handlePaste,
    handleCopyPath,
    handleContextRename,
    handleContextNewFile,
    handleContextNewFolder,
    handleContextDelete,
    closeMenu,
    deleteConfirm,
    setDeleteConfirm,
    deleteTitle,
    deleteMessage,
    runDelete,
  } = useStrategyTree(props);

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
              activePath={props.activePath}
              depth={0}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onNavigate={onNavigate}
              onDelete={requestDelete}
              onContextMenu={openContextMenu}
              onMoveFile={handleMoveFile}
              renaming={renaming}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameCommit={() => void commitRename()}
              onRenameCancel={cancelRename}
              newItemRequest={newItemRequest}
              clearNewItemRequest={clearNewItemRequest}
              contents={props.contents}
              onRefresh={props.onRefresh}
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
                    if (isRenamingThis) {
                      e.preventDefault();
                      return;
                    }
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
                        item.path === props.activePath
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
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDelete(item.path, "file");
                      }}
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

      <StrategyTreeFooter
        newMode={newMode}
        setNewMode={setNewMode}
        newName={newName}
        setNewName={setNewName}
        busy={busy}
        onAdd={() => void onAdd()}
      />

      {contextMenu ? (
        <StrategyTreeContextMenu
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

      <StrategyConfirmDialog
        open={deleteConfirm !== null}
        title={deleteTitle}
        message={deleteMessage}
        confirmLabel="Delete"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          const { path, type } = deleteConfirm;
          setDeleteConfirm(null);
          void runDelete(path, type);
        }}
      />
    </div>
  );
}
