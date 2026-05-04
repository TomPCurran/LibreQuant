"use client";

import { useEffect, useRef } from "react";
import {
  ClipboardPaste,
  Copy,
  FilePlus,
  FolderPlus,
  Link,
  Pencil,
  Trash2,
} from "lucide-react";

import type {
  StrategyClipboardItem,
  StrategyContextMenuState,
} from "./strategy-file-tree-types";

type StrategyTreeContextMenuProps = {
  menu: StrategyContextMenuState;
  clipboard: StrategyClipboardItem;
  onCopy: () => void;
  onPaste: () => void;
  onCopyPath: () => void;
  onRename: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function StrategyTreeContextMenu({
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
}: StrategyTreeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => ref.current?.focus());
  }, [menu.x, menu.y, menu.path]);

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium transition hover:bg-foreground/8";
  const canPaste = clipboard !== null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        aria-label="Dismiss menu"
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="menu"
        className="absolute z-50 min-w-[160px] rounded-xl border border-foreground/10 bg-background/95 py-1 shadow-xl outline-none backdrop-blur-xl"
        style={{ top: menu.y, left: menu.x }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
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
    </>
  );
}
