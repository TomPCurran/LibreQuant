"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import {
  StrategyDeleteDialog,
  StrategyLibraryDirectoryList,
} from "./strategy-delete-dialog";
import { StrategyLibraryToolbar } from "./strategy-library-toolbar";
import { useStrategyLibrary } from "./use-strategy-library";

export function StrategyLibraryPanel() {
  const {
    serviceManager,
    mgrError,
    items,
    listError,
    loading,
    busyAction,
    expanded,
    newStrategyName,
    setNewStrategyName,
    showNewForm,
    setShowNewForm,
    newFileDir,
    setNewFileDir,
    newFileName,
    setNewFileName,
    copiedPath,
    deleteDialog,
    setDeleteDialog,
    toggleExpand,
    onCreateStrategy,
    onAddFile,
    onDeleteDir,
    onDeleteFile,
    runPendingDelete,
    onCopyImport,
    onOpenFile,
  } = useStrategyLibrary();

  const combinedError = mgrError ?? listError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-light leading-relaxed text-text-secondary">
          Strategy modules live under{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            strategies/
          </code>{" "}
          on your Jupyter server. Each strategy is a directory with{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            .py
          </code>{" "}
          files you can import into notebooks.
        </p>
        <StrategyLibraryToolbar
          serviceManager={serviceManager}
          busyAction={busyAction}
          showNewForm={showNewForm}
          setShowNewForm={setShowNewForm}
          newStrategyName={newStrategyName}
          setNewStrategyName={setNewStrategyName}
          onCreateStrategy={onCreateStrategy}
        />
      </div>

      {combinedError ? (
        <div
          className="rounded-3xl border border-risk/30 bg-risk/5 px-4 py-3 text-sm font-light text-risk"
          role="alert"
        >
          {combinedError}
        </div>
      ) : null}

      {loading && !items.length ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm font-light text-text-secondary">
          <Loader2
            className="mr-2 size-5 animate-spin text-alpha"
            aria-hidden
          />
          Loading strategies…
        </div>
      ) : null}

      {!loading && !items.length && !combinedError ? (
        <div className="glass rounded-4xl p-8 text-center">
          <p className="heading-brand text-lg text-text-primary">
            No strategies yet
          </p>
          <p className="mt-2 text-sm font-light text-text-secondary">
            Create a new strategy to get started. Each strategy is a directory
            with Python files you can edit and import into notebooks.
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <StrategyLibraryDirectoryList
          items={items}
          expanded={expanded}
          busyAction={busyAction}
          copiedPath={copiedPath}
          newFileDir={newFileDir}
          newFileName={newFileName}
          setNewFileName={setNewFileName}
          setNewFileDir={setNewFileDir}
          toggleExpand={toggleExpand}
          onDeleteDir={onDeleteDir}
          onDeleteFile={onDeleteFile}
          onOpenFile={onOpenFile}
          onCopyImport={onCopyImport}
          onAddFile={onAddFile}
        />
      ) : null}

      <p className="text-xs font-light text-text-secondary">
        Open a{" "}
        <code className="font-mono-code text-[12px]">.py</code> file to edit it,
        or use the clipboard button to copy an import snippet for your notebooks.{" "}
        <Link
          href="/notebooks"
          className="font-medium text-alpha underline-offset-2 hover:underline"
        >
          Go to notebooks
        </Link>
        .
      </p>

      <StrategyDeleteDialog
        deleteDialog={deleteDialog}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={() => void runPendingDelete()}
      />
    </div>
  );
}
