import { FolderPlus, Loader2, Plus } from "lucide-react";

type Props = {
  depth: number;
  newMode: "file" | "folder" | null;
  setNewMode: (m: "file" | "folder" | null) => void;
  newName: string;
  setNewName: (v: string) => void;
  busy: boolean;
  onAdd: () => void | Promise<void>;
};

export function StrategyFileTreeNewItemBar({
  depth,
  newMode,
  setNewMode,
  newName,
  setNewName,
  busy,
  onAdd,
}: Props) {
  if (newMode) {
    return (
      <div
        className="flex flex-col gap-1 px-1 py-1"
        style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={newMode === "folder" ? "folder_name" : "module.py"}
          className="w-full rounded-lg border border-foreground/12 bg-background/80 px-2 py-1 text-xs font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
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
            className="flex-1 rounded-lg bg-alpha px-2 py-0.5 text-[10px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="mx-auto size-3 animate-spin" aria-hidden />
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
            className="flex-1 rounded-lg border border-foreground/12 px-2 py-0.5 text-[10px] font-medium text-text-secondary transition hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 px-1 py-0.5"
      style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
    >
      <button
        type="button"
        onClick={() => setNewMode("file")}
        className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
      >
        <Plus className="size-3" aria-hidden />
        File
      </button>
      <button
        type="button"
        onClick={() => setNewMode("folder")}
        className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
      >
        <FolderPlus className="size-3" aria-hidden />
        Folder
      </button>
    </div>
  );
}
