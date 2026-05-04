"use client";

import { FolderPlus, Loader2, Plus } from "lucide-react";

type StrategyTreeFooterProps = {
  newMode: "file" | "folder" | null;
  setNewMode: (m: "file" | "folder" | null) => void;
  newName: string;
  setNewName: (v: string) => void;
  busy: boolean;
  onAdd: () => void;
};

export function StrategyTreeFooter({
  newMode,
  setNewMode,
  newName,
  setNewName,
  busy,
  onAdd,
}: StrategyTreeFooterProps) {
  return (
    <div className="border-t border-foreground/8 px-2 py-2">
      {newMode ? (
        <div className="flex flex-col gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={newMode === "folder" ? "folder_name" : "module.py"}
            className="w-full rounded-lg border border-foreground/12 bg-background/80 px-2.5 py-1.5 text-xs font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
            aria-label={newMode === "folder" ? "New folder name" : "New file name"}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void onAdd();
              if (e.key === "Escape") {
                setNewMode(null);
                setNewName("");
              }
            }}
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void onAdd()}
              disabled={busy || !newName.trim()}
              className="flex-1 rounded-lg bg-alpha px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2
                  className="mx-auto size-3 animate-spin"
                  aria-hidden
                />
              ) : (
                "Add"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setNewMode(null);
                setNewName("");
              }}
              className="flex-1 rounded-lg border border-foreground/12 px-2 py-1 text-xs font-medium text-text-secondary transition hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => setNewMode("file")}
            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
          >
            <Plus className="size-3.5" aria-hidden />
            New file
          </button>
          <button
            type="button"
            onClick={() => setNewMode("folder")}
            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
          >
            <FolderPlus className="size-3.5" aria-hidden />
            New folder
          </button>
        </div>
      )}
    </div>
  );
}
