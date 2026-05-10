"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export function SidebarDataKeysSection({
  activeKeysOpen,
  onToggleOpen,
  statusLoading,
  activeKeyRows,
}: {
  activeKeysOpen: boolean;
  onToggleOpen: () => void;
  statusLoading: boolean;
  activeKeyRows: { id: string; label: string; count?: number }[];
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center gap-1 rounded-lg px-1.5 py-1 text-left transition hover:bg-foreground/5"
        aria-expanded={activeKeysOpen}
        aria-label={
          activeKeysOpen ? "Collapse active keys" : "Expand active keys"
        }
      >
        {activeKeysOpen ? (
          <ChevronDown
            className="size-3 shrink-0 text-text-secondary"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="size-3 shrink-0 text-text-secondary"
            aria-hidden
          />
        )}
        <span className="text-[9px] font-semibold uppercase tracking-widest text-text-secondary">
          Active keys
        </span>
        {!statusLoading ? (
          <span className="ml-auto tabular-nums text-[9px] text-text-secondary">
            {activeKeyRows.length}
          </span>
        ) : null}
      </button>

      {activeKeysOpen ? (
        statusLoading ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-text-secondary">
            <Loader2
              className="size-3 animate-spin text-alpha"
              aria-hidden
            />
            Loading…
          </div>
        ) : (
          <ul className="mb-2 space-y-1 px-1">
            {activeKeyRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[10px] text-text-secondary"
              >
                <CheckCircle2
                  className="size-3 shrink-0 text-alpha"
                  aria-hidden
                />
                <span className="truncate text-text-primary">
                  {row.label}
                </span>
                {row.count != null ? (
                  <span className="ml-auto tabular-nums text-[9px] text-text-secondary">
                    {row.count}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </>
  );
}
