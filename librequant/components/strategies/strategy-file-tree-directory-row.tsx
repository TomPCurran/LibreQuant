import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Trash2,
} from "lucide-react";

import type { StrategyFileItem } from "@/lib/types/strategy";

type Props = {
  item: StrategyFileItem;
  depth: number;
  isOpen: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  toggleExpanded: (path: string) => void;
  onDelete: (path: string, type: "file" | "directory") => void;
  onContextMenu: (e: React.MouseEvent, item: StrategyFileItem) => void;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
};

export function StrategyFileTreeDirectoryRow({
  item,
  depth,
  isOpen,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  toggleExpanded,
  onDelete,
  onContextMenu,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  return (
    <div
      className={`group flex items-center ${dragOver ? "rounded-lg bg-alpha/15" : ""}`}
      onContextMenu={(e) => onContextMenu(e, item)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.path, "directory");
          }}
          className="mr-1 shrink-0 rounded p-1 text-text-secondary opacity-0 transition hover:text-risk group-hover:opacity-100"
        >
          <Trash2 className="size-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
