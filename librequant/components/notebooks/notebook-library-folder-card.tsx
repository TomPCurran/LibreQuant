"use client";

import { ChevronDown, ChevronRight, FolderOpen, Trash2 } from "lucide-react";
import type { ComponentProps, DragEvent } from "react";

import type { NotebookFolderItem } from "@/lib/types/notebook";

import { NotebookTable } from "./notebook-library-table";

type TableProps = ComponentProps<typeof NotebookTable>;

type NotebookLibraryFolderCardProps = {
  folder: NotebookFolderItem;
  isExpanded: boolean;
  busyAction: string | null;
  isDragOver: boolean;
  onToggleExpand: () => void;
  onDeleteFolder: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  tableProps: Omit<TableProps, "notebooks" | "caption">;
};

export function NotebookLibraryFolderCard({
  folder,
  isExpanded,
  busyAction,
  isDragOver,
  onToggleExpand,
  onDeleteFolder,
  onDragOver,
  onDragLeave,
  onDrop,
  tableProps,
}: NotebookLibraryFolderCardProps) {
  return (
    <div
      className={`glass rounded-3xl transition-colors ${
        isDragOver ? "ring-2 ring-alpha/50 bg-alpha/5" : ""
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggleExpand}
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
          onClick={onToggleExpand}
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
          onClick={onDeleteFolder}
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
}
