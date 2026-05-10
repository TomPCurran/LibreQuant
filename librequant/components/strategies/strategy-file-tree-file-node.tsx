import { Trash2 } from "lucide-react";

import type { StrategyFileItem } from "@/lib/types/strategy";

import { DRAG_MIME, fileIcon } from "./strategy-file-tree-node-shared";
import type { RenameState } from "./strategy-file-tree-types";

type Props = {
  item: StrategyFileItem;
  activePath: string;
  depth: number;
  renaming: RenameState;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onNavigate: (path: string) => void;
  onDelete: (path: string, type: "file" | "directory") => void;
  onContextMenu: (e: React.MouseEvent, item: StrategyFileItem) => void;
};

export function StrategyFileTreeFileNode({
  item,
  activePath,
  depth,
  renaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onNavigate,
  onDelete,
  onContextMenu,
}: Props) {
  const isRenaming = renaming?.path === item.path;
  const isActive = item.path === activePath;

  return (
    <div
      className="group flex items-center"
      draggable={!isRenaming}
      onDragStart={(e) => {
        if (isRenaming) {
          e.preventDefault();
          return;
        }
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
          <span className="truncate font-mono-code text-[12px]">{item.name}</span>
        </button>
      )}
      {!isRenaming ? (
        <button
          type="button"
          aria-label={`Delete ${item.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.path, "file");
          }}
          className="mr-1 shrink-0 rounded p-1 text-text-secondary opacity-0 transition hover:text-risk group-hover:opacity-100"
        >
          <Trash2 className="size-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
