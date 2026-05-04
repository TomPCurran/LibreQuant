"use client";

import type { ComponentProps, DragEvent } from "react";

import type { NotebookFolderItem } from "@/lib/types/notebook";

import { NotebookTable } from "./notebook-library-table";

type TableProps = ComponentProps<typeof NotebookTable>;

type NotebookLibraryRootSectionProps = {
  rootFolder: NotebookFolderItem | undefined;
  dragOverRoot: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  tableProps: Omit<TableProps, "notebooks" | "caption">;
};

export function NotebookLibraryRootSection({
  rootFolder,
  dragOverRoot,
  onDragOver,
  onDragLeave,
  onDrop,
  tableProps,
}: NotebookLibraryRootSectionProps) {
  if (rootFolder && rootFolder.notebooks.length > 0) {
    return (
      <div
        className={`rounded-3xl transition-colors ${
          dragOverRoot ? "ring-2 ring-alpha/50 bg-alpha/5" : ""
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <NotebookTable
          notebooks={rootFolder.notebooks}
          caption="Notebooks at library root"
          {...tableProps}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border-2 border-dashed transition-colors ${
        dragOverRoot ? "border-alpha/50 bg-alpha/5" : "border-transparent"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="px-4 py-3" />
    </div>
  );
}
