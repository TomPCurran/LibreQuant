"use client";

import {
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Code2,
  FileCode2,
  Plus,
  Trash2,
} from "lucide-react";

import { formatDateTime } from "@/lib/format-date-time";
import type { StrategyDirectoryItem } from "@/lib/types/strategy";

import { StrategyConfirmDialog } from "./strategy-confirm-dialog";

export type StrategyDeleteDialogState =
  | { kind: "dir"; path: string }
  | { kind: "file"; path: string }
  | null;

export function StrategyDeleteDialog({
  deleteDialog,
  onCancel,
  onConfirm,
}: {
  deleteDialog: StrategyDeleteDialogState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <StrategyConfirmDialog
      open={deleteDialog !== null}
      title={
        deleteDialog?.kind === "dir"
          ? "Delete strategy?"
          : "Delete file?"
      }
      message={
        deleteDialog?.kind === "dir"
          ? "This will remove the strategy directory and all its files. This cannot be undone."
          : "This file will be removed. This cannot be undone."
      }
      confirmLabel="Delete"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function StrategyLibraryDirectoryList({
  items,
  expanded,
  busyAction,
  copiedPath,
  newFileDir,
  newFileName,
  setNewFileName,
  setNewFileDir,
  toggleExpand,
  onDeleteDir,
  onDeleteFile,
  onOpenFile,
  onCopyImport,
  onAddFile,
}: {
  items: StrategyDirectoryItem[];
  expanded: Set<string>;
  busyAction: string | null;
  copiedPath: string | null;
  newFileDir: string | null;
  newFileName: string;
  setNewFileName: (v: string) => void;
  setNewFileDir: (v: string | null) => void;
  toggleExpand: (path: string) => void;
  onDeleteDir: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onOpenFile: (path: string) => void;
  onCopyImport: (path: string) => void | Promise<void>;
  onAddFile: (dirPath: string) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((dir) => {
        const isExpanded = expanded.has(dir.path);
        const pyFiles = dir.files.filter(
          (f) => f.type === "file" && f.name.endsWith(".py"),
        );
        const otherFiles = dir.files.filter(
          (f) =>
            f.type === "file" &&
            !f.name.endsWith(".py") &&
            f.name !== "meta.json",
        );

        return (
          <div key={dir.path} className="glass rounded-3xl">
            <div className="flex items-center gap-3 px-4 py-4">
              <button
                type="button"
                onClick={() => toggleExpand(dir.path)}
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
                onClick={() => toggleExpand(dir.path)}
              >
                <Code2
                  className="size-4 shrink-0 text-alpha"
                  aria-hidden
                />
                <span className="truncate text-sm font-medium text-text-primary">
                  {dir.meta?.name || dir.name}
                </span>
                {dir.meta?.tags?.length ? (
                  <div className="flex gap-1">
                    {dir.meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-alpha/10 px-2 py-0.5 text-[10px] font-medium text-alpha"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <span className="shrink-0 text-xs font-light tabular-nums text-text-secondary">
                {formatDateTime(dir.last_modified)}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Delete ${dir.name}`}
                  disabled={busyAction !== null}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-risk/40 hover:text-risk disabled:opacity-40"
                  onClick={() => onDeleteDir(dir.path)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="border-t border-foreground/6 px-4 py-3">
                <div className="flex flex-col gap-1">
                  {pyFiles.map((file) => (
                    <div
                      key={file.path}
                      className="group flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-foreground/5"
                    >
                      <FileCode2
                        className="size-4 shrink-0 text-text-secondary"
                        aria-hidden
                      />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-sm font-light text-text-primary hover:text-alpha"
                        onClick={() => onOpenFile(file.path)}
                      >
                        <span className="font-mono-code text-[12px]">
                          {file.name}
                        </span>
                      </button>
                      <span className="shrink-0 text-xs font-light tabular-nums text-text-secondary">
                        {formatDateTime(file.last_modified)}
                      </span>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label={`Copy import for ${file.name}`}
                          title="Copy import snippet"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:text-alpha"
                          onClick={() => void onCopyImport(file.path)}
                        >
                          <ClipboardCopy
                            className="size-3.5"
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${file.name}`}
                          disabled={busyAction !== null}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:text-risk disabled:opacity-40"
                          onClick={() => onDeleteFile(file.path)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      {copiedPath === file.path ? (
                        <span className="text-xs font-medium text-alpha">
                          Copied!
                        </span>
                      ) : null}
                    </div>
                  ))}

                  {otherFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-light text-text-secondary"
                    >
                      <FileCode2 className="size-4 shrink-0" aria-hidden />
                      <span className="font-mono-code text-[12px]">
                        {file.name}
                      </span>
                    </div>
                  ))}

                  {newFileDir === dir.path ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="new_module.py"
                        className="min-w-[140px] flex-1 rounded-full border border-foreground/12 bg-background/80 px-3 py-1.5 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
                        aria-label="New file name"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            void onAddFile(dir.path);
                          if (e.key === "Escape") {
                            setNewFileDir(null);
                            setNewFileName("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void onAddFile(dir.path)}
                        disabled={busyAction !== null || !newFileName.trim()}
                        className="rounded-full bg-alpha px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewFileDir(null);
                          setNewFileName("");
                        }}
                        className="rounded-full border border-foreground/12 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNewFileDir(dir.path)}
                      disabled={busyAction !== null}
                      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary disabled:opacity-40"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add file
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
