"use client";

import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Folder,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import type { RefObject } from "react";

import type { DataLibraryEntry } from "@/lib/jupyter-contents";

import { childRelative } from "./data-library-helpers";
import { DataLibraryInlineFolderComposer } from "./data-library-inline-folder-composer";

export type DataLibraryTreeProps = {
  parentRel: string;
  depth: number;
  cache: Map<string, DataLibraryEntry[]>;
  expanded: Set<string>;
  loadingRels: Set<string>;
  busy: boolean;
  dragOverRel: string | null;
  onToggleExpand: (rel: string) => void;
  onDragOverDropZone: (e: React.DragEvent, targetRel: string) => void;
  onDragLeaveZone: (e: React.DragEvent) => void;
  onDropOnTarget: (e: React.DragEvent, targetRel: string) => void;
  onRowDragStart: (e: React.DragEvent, path: string, isDir: boolean) => void;
  onRenameClick: (entry: DataLibraryEntry, isDir: boolean) => void;
  onMoveClick: (entry: DataLibraryEntry, isDir: boolean) => void;
  onDeleteClick: (entry: DataLibraryEntry, isDir: boolean) => void;
  inlineNewFolderAt: string | null;
  inlineNewFolderName: string;
  newFolderInputRef: RefObject<HTMLInputElement | null>;
  onOpenInlineNewFolder: (parentRel: string) => void;
  onInlineNewFolderNameChange: (value: string) => void;
  onCancelInlineNewFolder: () => void;
  onSubmitInlineNewFolder: () => void;
};

export function DataLibraryTree({
  parentRel,
  depth,
  cache,
  expanded,
  loadingRels,
  busy,
  dragOverRel,
  onToggleExpand,
  onDragOverDropZone,
  onDragLeaveZone,
  onDropOnTarget,
  onRowDragStart,
  onRenameClick,
  onMoveClick,
  onDeleteClick,
  inlineNewFolderAt,
  inlineNewFolderName,
  newFolderInputRef,
  onOpenInlineNewFolder,
  onInlineNewFolderNameChange,
  onCancelInlineNewFolder,
  onSubmitInlineNewFolder,
}: DataLibraryTreeProps) {
  const items = cache.get(parentRel);
  if (items === undefined) return null;
  const pad = 12 + depth * 16;
  const composerOpen = inlineNewFolderAt === parentRel;

  return (
    <div role="group">
      {items.map((entry) => {
        const rel = childRelative(parentRel, entry.name);
        const isDir = entry.type === "directory";
        const isExpanded = expanded.has(rel);
        const loading = loadingRels.has(rel);
        const isRootListRow = parentRel === "";
        const rootFileDropTarget = !isDir && isRootListRow;
        const rowDropHighlight =
          (isDir && dragOverRel === rel) ||
          (rootFileDropTarget && dragOverRel === "");

        return (
          <div key={entry.path}>
            <div
              draggable={!busy}
              onDragStart={(e) => onRowDragStart(e, entry.path, isDir)}
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5.5rem] items-center gap-2 border-b border-foreground/5 text-sm last:border-0 ${
                rowDropHighlight
                  ? "bg-alpha/10 ring-1 ring-inset ring-alpha/35"
                  : ""
              }`}
              style={{ paddingLeft: pad }}
              onDragOver={
                isDir
                  ? (e) => onDragOverDropZone(e, rel)
                  : rootFileDropTarget
                    ? (e) => onDragOverDropZone(e, "")
                    : undefined
              }
              onDragLeave={
                isDir || rootFileDropTarget ? onDragLeaveZone : undefined
              }
              onDrop={
                isDir
                  ? (e) => void onDropOnTarget(e, rel)
                  : rootFileDropTarget
                    ? (e) => void onDropOnTarget(e, "")
                    : undefined
              }
            >
              <div className="flex min-w-0 items-center gap-1 py-2">
                {isDir ? (
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-foreground/10 hover:text-alpha"
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded ? "Collapse folder" : "Expand folder"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(rel);
                    }}
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : isExpanded ? (
                      <ChevronDown className="size-4" aria-hidden />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden />
                    )}
                  </button>
                ) : (
                  <span className="inline-block w-7 shrink-0" aria-hidden />
                )}
                {isDir ? (
                  <Folder
                    className="size-4 shrink-0 text-alpha/80"
                    aria-hidden
                  />
                ) : (
                  <FileSpreadsheet
                    className="size-4 shrink-0 text-alpha/80"
                    aria-hidden
                  />
                )}
                <span
                  className={`truncate font-mono-code text-[13px] ${
                    isDir ? "font-medium text-alpha" : "text-text-primary"
                  }`}
                >
                  {entry.name}
                </span>
              </div>
              <div className="hidden text-xs text-text-secondary sm:block">
                {entry.last_modified
                  ? new Date(entry.last_modified).toLocaleString()
                  : "—"}
              </div>
              <div className="flex justify-end gap-0.5 py-1">
                <button
                  type="button"
                  disabled={busy}
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameClick(entry, isDir);
                  }}
                  className="rounded-lg p-1.5 text-text-secondary transition hover:bg-foreground/10 hover:text-alpha disabled:opacity-50"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  title="Move to folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveClick(entry, isDir);
                  }}
                  className="rounded-lg p-1.5 text-text-secondary transition hover:bg-foreground/10 hover:text-alpha disabled:opacity-50"
                >
                  <Folder className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(entry, isDir);
                  }}
                  className="rounded-lg p-1.5 text-text-secondary transition hover:bg-foreground/10 hover:text-risk disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
            {isDir && isExpanded ? (
              <DataLibraryTree
                parentRel={rel}
                depth={depth + 1}
                cache={cache}
                expanded={expanded}
                loadingRels={loadingRels}
                busy={busy}
                dragOverRel={dragOverRel}
                onToggleExpand={onToggleExpand}
                onDragOverDropZone={onDragOverDropZone}
                onDragLeaveZone={onDragLeaveZone}
                onDropOnTarget={onDropOnTarget}
                onRowDragStart={onRowDragStart}
                onRenameClick={onRenameClick}
                onMoveClick={onMoveClick}
                onDeleteClick={onDeleteClick}
                inlineNewFolderAt={inlineNewFolderAt}
                inlineNewFolderName={inlineNewFolderName}
                newFolderInputRef={newFolderInputRef}
                onOpenInlineNewFolder={onOpenInlineNewFolder}
                onInlineNewFolderNameChange={onInlineNewFolderNameChange}
                onCancelInlineNewFolder={onCancelInlineNewFolder}
                onSubmitInlineNewFolder={onSubmitInlineNewFolder}
              />
            ) : null}
          </div>
        );
      })}
      <DataLibraryInlineFolderComposer
        parentRel={parentRel}
        depth={depth}
        busy={busy}
        composerOpen={composerOpen}
        inlineNewFolderName={inlineNewFolderName}
        newFolderInputRef={newFolderInputRef}
        onInlineNewFolderNameChange={onInlineNewFolderNameChange}
        onCancelInlineNewFolder={onCancelInlineNewFolder}
        onSubmitInlineNewFolder={onSubmitInlineNewFolder}
        onOpenInlineNewFolder={onOpenInlineNewFolder}
      />
    </div>
  );
}
