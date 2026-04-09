"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useWorkbenchStore } from "@/lib/stores/workbench-store";
import { PackageSearchPanel } from "@/components/package-search/package-search-panel";

type Props = {
  notebookId: string;
};

export function PackageSearchModal({ notebookId }: Props) {
  const open = useWorkbenchStore((s) => s.packageSearchOpen);
  const setOpen = useWorkbenchStore((s) => s.setPackageSearchOpen);
  const generation = useWorkbenchStore((s) => s.packageSearchGeneration);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open) {
      d.showModal();
    } else {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[200] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-4xl border border-foreground/10 bg-background p-0 text-foreground shadow-xl shadow-foreground/15 backdrop:bg-black/45 open:backdrop:backdrop-blur-sm"
      aria-labelledby="pypi-modal-title"
      onMouseDown={(e) => {
        if (e.target === dialogRef.current) setOpen(false);
      }}
      onCancel={(e) => {
        e.preventDefault();
        setOpen(false);
      }}
    >
      <div
        className="max-h-[min(90vh,720px)] overflow-y-auto p-6 md:p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="pypi-modal-title" className="heading-brand text-lg text-foreground">
              Install packages
            </h2>
            <p className="mt-1 text-xs font-light text-text-secondary">
              Search PyPI and install into the active kernel environment.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-text-secondary transition hover:border-foreground/20 hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {open ? (
          <PackageSearchPanel
            key={generation}
            notebookId={notebookId}
            autoFocus
          />
        ) : null}
      </div>
    </dialog>
  );
}
