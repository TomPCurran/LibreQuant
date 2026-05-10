import type { ServiceManager } from "@jupyterlab/services";
import { FileUp, FolderPlus, Loader2, Plus } from "lucide-react";
import type { RefObject } from "react";

import { ONBOARDING_NOTEBOOKS } from "@/lib/notebook-onboarding";

type Props = {
  libraryRoot: string;
  serviceManager: ServiceManager.IManager | null;
  busyAction: string | null;
  showNewFolder: boolean;
  setShowNewFolder: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  onNewNotebook: () => void | Promise<void>;
  onNewFolder: () => void | Promise<void>;
  onUploadClick: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (ev: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
};

export function NotebookLibraryToolbar({
  libraryRoot,
  serviceManager,
  busyAction,
  showNewFolder,
  setShowNewFolder,
  newFolderName,
  setNewFolderName,
  onNewNotebook,
  onNewFolder,
  onUploadClick,
  fileInputRef,
  onFileChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-sm font-light leading-relaxed text-text-secondary">
        Files live under{" "}
        <code className="font-mono-code text-[12px] text-text-primary">
          {libraryRoot}
        </code>{" "}
        on your Jupyter server (persisted when using Docker compose). With Compose, demo
        notebooks from the repository —{" "}
        {ONBOARDING_NOTEBOOKS.map((name, i) => (
          <span key={name}>
            {i > 0 ? " and " : null}
            <code className="font-mono-code text-[12px]">{name}</code>
          </span>
        ))}{" "}
        — are copied into this folder on Jupyter container start when those files are not
        already present (restart the{" "}
        <code className="font-mono-code text-[12px]">jupyter</code> service to pick them up).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onNewNotebook()}
          disabled={!serviceManager || busyAction !== null}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-alpha px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90 disabled:opacity-50"
        >
          {busyAction === "new" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          New Notebook
        </button>
        <button
          type="button"
          onClick={onUploadClick}
          disabled={!serviceManager || busyAction !== null}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/12 bg-foreground/5 px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07] disabled:opacity-50"
        >
          {busyAction === "upload" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <FileUp className="size-4" aria-hidden />
          )}
          Upload
        </button>
        {showNewFolder ? (
          <div className="flex items-center gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="folder_name"
              className="min-w-[140px] rounded-full border border-foreground/12 bg-background/80 px-3 py-2 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
              aria-label="New folder name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void onNewFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => void onNewFolder()}
              disabled={busyAction !== null || !newFolderName.trim()}
              className="rounded-full bg-alpha px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
              className="rounded-full border border-foreground/12 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewFolder(true)}
            disabled={!serviceManager || busyAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/12 bg-foreground/5 px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07] disabled:opacity-50"
          >
            <FolderPlus className="size-4" aria-hidden />
            New Folder
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ipynb,application/x-ipynb+json,application/json"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(ev) => void onFileChange(ev)}
        />
      </div>
    </div>
  );
}
