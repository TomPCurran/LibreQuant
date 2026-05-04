"use client";

type StrategyConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function StrategyConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: StrategyConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl"
        role="alertdialog"
        aria-labelledby="strategy-confirm-title"
      >
        <h3
          id="strategy-confirm-title"
          className={`text-sm font-semibold ${danger ? "text-risk" : "text-text-primary"}`}
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ${
              danger ? "bg-risk" : "bg-alpha"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
