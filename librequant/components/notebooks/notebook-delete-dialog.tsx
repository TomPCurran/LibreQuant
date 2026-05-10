"use client";

import { StrategyConfirmDialog } from "@/components/strategies/strategy-confirm-dialog";

export type NotebookDeleteTarget =
  | { kind: "notebook"; path: string }
  | { kind: "folder"; path: string }
  | null;

type NotebookDeleteDialogProps = {
  target: NotebookDeleteTarget;
  onCancel: () => void;
  onConfirm: () => void;
};

export function NotebookDeleteDialog({
  target,
  onCancel,
  onConfirm,
}: NotebookDeleteDialogProps) {
  const isFolder = target?.kind === "folder";
  return (
    <StrategyConfirmDialog
      open={target !== null}
      title={isFolder ? "Delete folder?" : "Delete notebook?"}
      message={
        isFolder
          ? "This will remove the folder and all notebooks inside it. This cannot be undone."
          : "This notebook will be removed from your Jupyter workspace. This cannot be undone."
      }
      confirmLabel="Delete"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
