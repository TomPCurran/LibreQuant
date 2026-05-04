"use client";

import { Loader2 } from "lucide-react";

import { DataLibraryActionsModals } from "./data-library-actions";
import { DataLibraryTree } from "./data-library-table";
import { DataLibraryUploadPipeline } from "./upload-pipeline";
import { useDataLibrary } from "./use-data-library";

export function DataLibraryManager() {
  const dl = useDataLibrary();

  return (
    <>
      <div className="space-y-4">
        <DataLibraryUploadPipeline
          uploadsPrefix={dl.uploadsPrefix}
          blocked={dl.blocked}
          busy={dl.busy}
          rootLoading={dl.rootLoading}
          dragOverRel={dl.dragOverRel}
          fileInputId={dl.fileInputId}
          dirInputId={dl.dirInputId}
          fileInputRef={dl.fileInputRef}
          dirInputRef={dl.dirInputRef}
          onPickFiles={dl.onPickFiles}
          onPickDirectory={dl.onPickDirectory}
          onOpenInlineNewFolder={dl.openInlineNewFolder}
          onRefresh={dl.refreshTree}
          onDragOverDropZone={dl.onDragOverDropZone}
          onDragLeaveZone={dl.onDragLeaveZone}
          onDropTarget={dl.onDropTarget}
        />

        {dl.blocked ? (
          <p className="text-sm text-risk">
            Jupyter is not connected — start Docker and wait for the workbench to
            connect before managing files.
          </p>
        ) : (
          <>
            {dl.listError ? (
              <p className="text-sm text-risk" role="alert">
                {dl.listError}
              </p>
            ) : dl.rootLoading && dl.rootEntries.length === 0 ? (
              <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
                <Loader2 className="size-4 animate-spin text-alpha" aria-hidden />
                Loading library…
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-foreground/10">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5.5rem] gap-2 border-b border-foreground/10 bg-foreground/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  <div className="pl-[52px]">Name</div>
                  <div className="hidden sm:block">Modified</div>
                  <div className="text-right">Actions</div>
                </div>
                {dl.rootEntries.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-text-secondary">
                    This folder is empty. Upload CSV/Excel files or add a folder
                    below.
                  </p>
                ) : null}
                <DataLibraryTree
                  parentRel=""
                  depth={0}
                  cache={dl.cache}
                  expanded={dl.expanded}
                  loadingRels={dl.loadingRels}
                  busy={dl.busy}
                  dragOverRel={dl.dragOverRel}
                  onToggleExpand={dl.toggleExpand}
                  onDragOverDropZone={dl.onDragOverDropZone}
                  onDragLeaveZone={dl.onDragLeaveZone}
                  onDropOnTarget={dl.onDropTarget}
                  onRowDragStart={dl.onRowDragStart}
                  onRenameClick={dl.handleRenameClick}
                  onMoveClick={dl.handleMoveClick}
                  onDeleteClick={dl.handleDeleteClick}
                  inlineNewFolderAt={dl.inlineNewFolderAt}
                  inlineNewFolderName={dl.inlineNewFolderName}
                  newFolderInputRef={dl.newFolderInputRef}
                  onOpenInlineNewFolder={dl.openInlineNewFolder}
                  onInlineNewFolderNameChange={dl.setInlineNewFolderName}
                  onCancelInlineNewFolder={dl.cancelInlineNewFolder}
                  onSubmitInlineNewFolder={() => void dl.submitInlineNewFolder()}
                />
              </div>
            )}

            {dl.statusMsg ? (
              <p className="mt-3 text-sm text-text-secondary" role="status">
                {dl.statusMsg}
              </p>
            ) : null}
          </>
        )}
      </div>

      <DataLibraryActionsModals
        busy={dl.busy}
        renameState={dl.renameState}
        renameValue={dl.renameValue}
        onRenameValueChange={dl.setRenameValue}
        onRenameCancel={() => dl.setRenameState(null)}
        onRenameConfirm={dl.onConfirmRename}
        moveState={dl.moveState}
        moveTargetRel={dl.moveTargetRel}
        moveFolderOptions={dl.moveFolderOptions}
        onMoveTargetChange={dl.setMoveTargetRel}
        onMoveCancel={() => dl.setMoveState(null)}
        onMoveConfirm={dl.onConfirmMove}
        deleteState={dl.deleteState}
        onDeleteCancel={() => dl.setDeleteState(null)}
        onDeleteConfirm={dl.onConfirmDelete}
      />
    </>
  );
}
