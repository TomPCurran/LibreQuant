"use client";

import type { UploadsFolderOption } from "@/lib/jupyter-contents";

import type { DeleteState, MoveState, RenameState } from "./data-library-dialog-state";
import { UPLOADS_ROOT_SELECT_VALUE } from "./data-library-helpers";

export type { DeleteState, MoveState, RenameState } from "./data-library-dialog-state";

type DataLibraryActionsProps = {
  busy: boolean;
  renameState: RenameState | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameCancel: () => void;
  onRenameConfirm: () => void;
  moveState: MoveState | null;
  moveTargetRel: string;
  moveFolderOptions: UploadsFolderOption[];
  onMoveTargetChange: (rel: string) => void;
  onMoveCancel: () => void;
  onMoveConfirm: () => void;
  deleteState: DeleteState | null;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
};

export function DataLibraryActionsModals({
  busy,
  renameState,
  renameValue,
  onRenameValueChange,
  onRenameCancel,
  onRenameConfirm,
  moveState,
  moveTargetRel,
  moveFolderOptions,
  onMoveTargetChange,
  onMoveCancel,
  onMoveConfirm,
  deleteState,
  onDeleteCancel,
  onDeleteConfirm,
}: DataLibraryActionsProps) {
  return (
    <>
      {renameState ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) onRenameCancel();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl"
            role="dialog"
            aria-labelledby="rename-dialog-title"
          >
            <h3
              id="rename-dialog-title"
              className="text-sm font-semibold text-text-primary"
            >
              Rename {renameState.isDir ? "folder" : "file"}
            </h3>
            <label className="mt-3 block text-sm text-text-secondary">
              New name
              <input
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-sm text-text-primary outline-none ring-alpha/30 focus-visible:ring-2"
                autoFocus
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                onClick={onRenameCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !renameValue.trim()}
                className="rounded-full bg-alpha px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => void onRenameConfirm()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {moveState ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) onMoveCancel();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl"
            role="dialog"
            aria-labelledby="move-dialog-title"
          >
            <h3
              id="move-dialog-title"
              className="text-sm font-semibold text-text-primary"
            >
              Move &quot;{moveState.name}&quot;
            </h3>
            <label className="mt-3 block text-sm text-text-secondary">
              Destination folder
              <select
                value={
                  moveTargetRel === ""
                    ? UPLOADS_ROOT_SELECT_VALUE
                    : moveTargetRel
                }
                onChange={(e) => {
                  const v = e.target.value;
                  onMoveTargetChange(
                    v === UPLOADS_ROOT_SELECT_VALUE ? "" : v,
                  );
                }}
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-xs text-text-primary outline-none ring-alpha/30 focus-visible:ring-2"
              >
                {moveFolderOptions.map((o) => (
                  <option
                    key={o.relative || "root"}
                    value={
                      o.relative === ""
                        ? UPLOADS_ROOT_SELECT_VALUE
                        : o.relative
                    }
                  >
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                onClick={onMoveCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-full bg-alpha px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => void onMoveConfirm()}
              >
                Move here
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteState ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) onDeleteCancel();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl"
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
          >
            <h3
              id="delete-dialog-title"
              className="text-sm font-semibold text-risk"
            >
              Delete {deleteState.isDir ? "folder" : "file"}?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              {deleteState.isDir
                ? "This will remove the folder and everything inside it. This cannot be undone."
                : "This file will be removed from your Jupyter workspace. This cannot be undone."}
            </p>
            <p className="mt-1 font-mono-code text-xs text-text-primary">
              {deleteState.name}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                onClick={onDeleteCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-full bg-risk px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => void onDeleteConfirm()}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
