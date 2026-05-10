"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";

import type { CredentialSaveState } from "./use-credential-save";

type CustomEnvFormProps = {
  cred: CredentialSaveState;
};

export function CustomEnvForm({ cred }: CustomEnvFormProps) {
  const {
    genericCustomKeys,
    pendingRemoval,
    setPendingRemoval,
    editingCustomKey,
    setEditingCustomKey,
    customEditValue,
    setCustomEditValue,
    newCustomRows,
    setNewCustomRows,
  } = cred;

  return (
    <div className="rounded-xl border border-foreground/8 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Custom API keys
        </h3>
        <p className="mt-1 text-xs font-light leading-relaxed text-text-secondary">
          Add any uppercase env name (e.g.{" "}
          <code className="font-mono-code text-[11px]">MY_DATA_API_KEY</code>)
          and secret. Do not use{" "}
          <code className="font-mono-code text-[11px]">LIBREQUANT_DATABASE_URL</code>{" "}
          or{" "}
          <code className="font-mono-code text-[11px]">LIBREQUANT_DB_*_URL</code>{" "}
          — use{" "}
          <strong className="font-medium text-text-primary">
            Database connections
          </strong>{" "}
          below. After saving, keys sync to Jupyter — use{" "}
          <code className="font-mono-code text-[11px]">
            load_data_source_secrets()
          </code>{" "}
          or call <code className="font-mono-code text-[11px]">get_bars</code> so{" "}
          <code className="font-mono-code text-[11px]">os.environ</code> is
          updated. Names cannot overlap built-in providers or{" "}
          <code className="font-mono-code text-[11px]">NEXT_PUBLIC_*</code>.
        </p>
      </div>

      <ul className="mb-4 space-y-2">
        {genericCustomKeys
          .filter((k) => !pendingRemoval.has(k))
          .map((name) => (
            <li
              key={name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-foreground/2 px-3 py-2"
            >
              <div className="min-w-0">
                <code className="font-mono-code text-[13px] text-alpha">
                  {name}
                </code>
                <span className="ml-2 text-xs text-text-secondary">stored</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {editingCustomKey === name ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-text-secondary hover:text-text-primary"
                    onClick={() => {
                      setEditingCustomKey(null);
                      setCustomEditValue("");
                    }}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustomKey(name);
                      setCustomEditValue("");
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-alpha/30 bg-alpha/10 px-2.5 py-1 text-xs font-medium text-alpha transition hover:bg-alpha/15"
                  >
                    <Pencil className="size-3" aria-hidden />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPendingRemoval((prev) => new Set(prev).add(name));
                    if (editingCustomKey === name) {
                      setEditingCustomKey(null);
                      setCustomEditValue("");
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-2.5 py-1 text-xs font-medium text-text-secondary transition hover:border-risk/40 hover:text-risk"
                  aria-label={`Remove ${name}`}
                >
                  <Trash2 className="size-3" aria-hidden />
                  Remove
                </button>
              </div>
            </li>
          ))}
      </ul>

      {editingCustomKey ? (
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium text-text-primary">
            New value for{" "}
            <code className="font-mono-code text-[12px]">{editingCustomKey}</code>
          </span>
          <input
            type="password"
            autoComplete="off"
            placeholder="New secret"
            value={customEditValue}
            onChange={(e) => setCustomEditValue(e.target.value)}
            className="mt-1 w-full max-w-md rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
          />
        </label>
      ) : null}

      {pendingRemoval.size > 0 ? (
        <p className="mb-3 text-xs text-text-secondary">
          {pendingRemoval.size} key(s) marked for removal — Save keys to apply.
        </p>
      ) : null}

      <div className="space-y-3">
        {newCustomRows.map((row) => (
          <div
            key={row.id}
            className="grid gap-3 rounded-lg border border-dashed border-foreground/15 p-3 sm:grid-cols-2"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text-primary">
                Variable name
              </span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="MY_VENDOR_API_KEY"
                value={row.name}
                onChange={(e) =>
                  setNewCustomRows((rows) =>
                    rows.map((r) =>
                      r.id === row.id
                        ? { ...r, name: e.target.value.toUpperCase() }
                        : r,
                    ),
                  )
                }
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text-primary">
                Secret
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  value={row.value}
                  onChange={(e) =>
                    setNewCustomRows((rows) =>
                      rows.map((r) =>
                        r.id === row.id ? { ...r, value: e.target.value } : r,
                      ),
                    )
                  }
                  className="min-w-0 flex-1 rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-sm text-text-primary outline-none ring-alpha/30 focus-visible:ring-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    setNewCustomRows((rows) => rows.filter((r) => r.id !== row.id))
                  }
                  className="shrink-0 rounded-lg border border-foreground/15 px-2 py-2 text-text-secondary hover:text-risk"
                  aria-label="Remove row"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setNewCustomRows((rows) => [
            ...rows,
            { id: `new-${Date.now()}`, name: "", value: "" },
          ])
        }
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-alpha/30 hover:text-alpha"
      >
        <Plus className="size-3.5" aria-hidden />
        Add custom key
      </button>
    </div>
  );
}
