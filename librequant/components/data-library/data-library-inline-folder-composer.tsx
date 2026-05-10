"use client";

import type { RefObject } from "react";
import { FolderPlus } from "lucide-react";

type DataLibraryInlineFolderComposerProps = {
  parentRel: string;
  depth: number;
  busy: boolean;
  composerOpen: boolean;
  inlineNewFolderName: string;
  newFolderInputRef: RefObject<HTMLInputElement | null>;
  onInlineNewFolderNameChange: (value: string) => void;
  onCancelInlineNewFolder: () => void;
  onSubmitInlineNewFolder: () => void;
  onOpenInlineNewFolder: (parentRel: string) => void;
};

export function DataLibraryInlineFolderComposer({
  parentRel,
  depth,
  busy,
  composerOpen,
  inlineNewFolderName,
  newFolderInputRef,
  onInlineNewFolderNameChange,
  onCancelInlineNewFolder,
  onSubmitInlineNewFolder,
  onOpenInlineNewFolder,
}: DataLibraryInlineFolderComposerProps) {
  const pad = 12 + depth * 16;
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5.5rem] items-center gap-2 border-b border-foreground/5 text-sm ${
        composerOpen ? "bg-alpha/4" : ""
      }`}
      style={{ paddingLeft: pad }}
    >
      {composerOpen ? (
        <>
          <div className="flex min-w-0 items-center gap-1 py-2">
            <span className="inline-block w-7 shrink-0" aria-hidden />
            <FolderPlus
              className="size-4 shrink-0 text-alpha/60"
              aria-hidden
            />
            <input
              ref={newFolderInputRef}
              type="text"
              value={inlineNewFolderName}
              onChange={(e) => onInlineNewFolderNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmitInlineNewFolder();
                }
                if (e.key === "Escape") onCancelInlineNewFolder();
              }}
              placeholder="Folder name"
              disabled={busy}
              aria-label="New folder name"
              className="min-w-0 flex-1 rounded-lg border border-foreground/15 bg-background px-2.5 py-1.5 font-mono-code text-[13px] text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/50 focus-visible:ring-2 disabled:opacity-50"
            />
          </div>
          <div className="hidden text-xs text-text-secondary sm:block">—</div>
          <div className="flex justify-end gap-1 py-1">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-foreground/10 hover:text-text-primary disabled:opacity-50"
              onClick={onCancelInlineNewFolder}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !inlineNewFolderName.trim()}
              className="rounded-lg bg-alpha/90 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-alpha disabled:opacity-50"
              onClick={() => onSubmitInlineNewFolder()}
            >
              Create
            </button>
          </div>
        </>
      ) : (
        <div className="col-span-3 flex min-w-0 py-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenInlineNewFolder(parentRel)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pr-2 text-left text-[13px] text-text-secondary transition hover:bg-foreground/5 hover:text-alpha disabled:opacity-50"
          >
            <span className="inline-block w-7 shrink-0" aria-hidden />
            <FolderPlus
              className="size-4 shrink-0 text-alpha/50"
              aria-hidden
            />
            <span>Add new folder</span>
          </button>
        </div>
      )}
    </div>
  );
}
