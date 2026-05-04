"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { NotebookDeleteDialog } from "./notebook-delete-dialog";
import { NotebookLibraryFolderCard } from "./notebook-library-folder-card";
import { NotebookLibraryRootSection } from "./notebook-library-root-section";
import { NotebookLibraryToolbar } from "./notebook-library-toolbar";
import { useNotebookLibraryPanel } from "./use-notebook-library";

export function NotebookLibraryPanel() {
  const p = useNotebookLibraryPanel();

  return (
    <div className="flex flex-col gap-6">
      <NotebookLibraryToolbar
        libraryRoot={p.libraryRoot}
        serviceManager={p.serviceManager}
        busyAction={p.busyAction}
        showNewFolder={p.showNewFolder}
        setShowNewFolder={p.setShowNewFolder}
        newFolderName={p.newFolderName}
        setNewFolderName={p.setNewFolderName}
        onNewNotebook={p.onNewNotebook}
        onNewFolder={p.onNewFolder}
        onUploadClick={p.onUploadClick}
        fileInputRef={p.fileInputRef}
        onFileChange={p.onFileChange}
      />

      {p.combinedError ? (
        <div
          className="rounded-3xl border border-risk/30 bg-risk/5 px-4 py-3 text-sm font-light text-risk"
          role="alert"
        >
          {p.combinedError}
        </div>
      ) : null}

      {p.loading && p.totalNotebooks === 0 && p.subFolders.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm font-light text-text-secondary">
          <Loader2
            className="mr-2 size-5 animate-spin text-alpha"
            aria-hidden
          />
          Loading notebooks…
        </div>
      ) : null}

      {!p.loading &&
      p.totalNotebooks === 0 &&
      p.subFolders.length === 0 &&
      !p.combinedError ? (
        <div className="glass rounded-4xl p-8 text-center">
          <p className="heading-brand text-lg text-text-primary">
            No notebooks yet
          </p>
          <p className="mt-2 text-sm font-light text-text-secondary">
            Create a new notebook or upload an{" "}
            <span className="font-mono-code text-[12px]">.ipynb</span> from your
            machine.
          </p>
        </div>
      ) : null}

      <NotebookLibraryRootSection
        rootFolder={p.rootFolder}
        dragOverRoot={p.dragOverFolder === "__root__"}
        onDragOver={p.handleRootDragOver}
        onDragLeave={p.handleRootDragLeave}
        onDrop={p.handleRootDrop}
        tableProps={p.tableProps}
      />

      {p.subFolders.length > 0 ? (
        <div className="flex flex-col gap-4">
          {p.subFolders.map((folder) => {
            const isExpanded = p.expanded.has(folder.path);
            return (
              <NotebookLibraryFolderCard
                key={folder.path}
                folder={folder}
                isExpanded={isExpanded}
                busyAction={p.busyAction}
                isDragOver={p.dragOverFolder === folder.path}
                onToggleExpand={() => p.toggleExpand(folder.path)}
                onDeleteFolder={() => p.requestDeleteFolder(folder.path)}
                onDragOver={(e) => p.handleFolderDragOver(e, folder.path)}
                onDragLeave={(e) => p.handleFolderDragLeave(e, folder.path)}
                onDrop={(e) => p.handleFolderDrop(e, folder.path)}
                tableProps={p.tableProps}
              />
            );
          })}
        </div>
      ) : null}

      <p className="text-xs font-light text-text-secondary">
        Prefer the file browser in Jupyter?{" "}
        <Link
          href="/"
          className="font-medium text-alpha underline-offset-2 hover:underline"
        >
          Open the workspace
        </Link>
        .
      </p>

      <NotebookDeleteDialog
        target={p.deleteTarget}
        onCancel={() => p.setDeleteTarget(null)}
        onConfirm={() => void p.runPendingDelete()}
      />
    </div>
  );
}
