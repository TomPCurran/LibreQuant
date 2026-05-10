import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { memo } from "react";

import { formatDateTime } from "@/lib/format-date-time";
import { notebookStemFromPath } from "@/lib/jupyter-paths";
import type { NotebookListItem } from "@/lib/types/notebook";

import { NOTEBOOK_LIBRARY_DRAG_MIME } from "./notebook-library-dnd";

export { NOTEBOOK_LIBRARY_DRAG_MIME };

const NotebookRow = memo(function NotebookRow({
  row,
  busyAction,
  renamePath,
  renameValue,
  setRenameValue,
  onOpen,
  startRename,
  cancelRename,
  commitRename,
  onDelete,
}: {
  row: NotebookListItem;
  busyAction: string | null;
  renamePath: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onOpen: (path: string) => void;
  startRename: (path: string) => void;
  cancelRename: () => void;
  commitRename: () => void;
  onDelete: (path: string) => void;
}) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(NOTEBOOK_LIBRARY_DRAG_MIME, row.path);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <tr
      className="glass cursor-grab rounded-3xl active:cursor-grabbing"
      draggable
      onDragStart={onDragStart}
    >
      <td className="rounded-l-3xl px-4 py-4 align-middle">
        {renamePath === row.path ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={renameValue}
              onChange={(ev) => setRenameValue(ev.target.value)}
              className="min-w-[160px] flex-1 rounded-full border border-foreground/12 bg-background/80 px-3 py-2 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
              aria-label="New notebook name"
              autoFocus
              onKeyDown={(ev) => {
                if (ev.key === "Enter") void commitRename();
                if (ev.key === "Escape") cancelRename();
              }}
            />
            <button
              type="button"
              className="rounded-full bg-alpha px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
              onClick={() => void commitRename()}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-full border border-foreground/12 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
              onClick={cancelRename}
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="text-sm font-light text-text-primary">
            {notebookStemFromPath(row.path)}
          </span>
        )}
      </td>
      <td className="px-4 py-4 align-middle text-sm font-light tabular-nums text-text-secondary">
        {formatDateTime(row.created)}
      </td>
      <td className="px-4 py-4 align-middle text-sm font-light tabular-nums text-text-secondary">
        {formatDateTime(row.last_modified)}
      </td>
      <td className="rounded-r-3xl px-4 py-4 align-middle text-right">
        <div className="inline-flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Open ${row.name}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-alpha/35 hover:text-alpha"
            onClick={() => onOpen(row.path)}
          >
            <ExternalLink className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Rename ${row.name}`}
            disabled={busyAction !== null}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-alpha/35 hover:text-alpha disabled:opacity-40"
            onClick={() => startRename(row.path)}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Delete ${row.name}`}
            disabled={busyAction !== null}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-risk/40 hover:text-risk disabled:opacity-40"
            onClick={() => onDelete(row.path)}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  );
});

export const NotebookTable = memo(function NotebookTable({
  notebooks,
  caption,
  busyAction,
  renamePath,
  renameValue,
  setRenameValue,
  onOpen,
  startRename,
  cancelRename,
  commitRename,
  onDelete,
}: {
  notebooks: NotebookListItem[];
  caption: string;
  busyAction: string | null;
  renamePath: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onOpen: (path: string) => void;
  startRename: (path: string) => void;
  cancelRename: () => void;
  commitRename: () => void;
  onDelete: (path: string) => void;
}) {
  if (notebooks.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-y-2">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
            >
              Created
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
            >
              Last updated
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-xs font-medium uppercase tracking-[0.12em] text-text-secondary"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {notebooks.map((row) => (
            <NotebookRow
              key={row.path}
              row={row}
              busyAction={busyAction}
              renamePath={renamePath}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onOpen={onOpen}
              startRename={startRename}
              cancelRename={cancelRename}
              commitRename={commitRename}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});
