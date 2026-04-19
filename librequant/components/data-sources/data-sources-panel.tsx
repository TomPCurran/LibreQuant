"use client";

import dynamic from "next/dynamic";
import { useCallback, useId, useState, type ComponentType } from "react";
import {
  ChevronDown,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { DATA_SOURCES_CHANGED_EVENT } from "@/lib/data-sources/constants";
import {
  customEnvKeyNameError,
  type ManagedSecretKey,
} from "@/lib/data-sources/custom-env-key";
import { useDataSourcesStatusOptional } from "@/lib/data-sources-status-context";

const DataLibraryManager = dynamic(
  () => import("@/components/data-library-manager.client"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-foreground/10 py-12 text-center text-sm text-text-secondary">
        Loading data library…
      </div>
    ),
  },
);

export type { CredentialsPresence } from "@/lib/data-sources-status-context";

type IconProps = { className?: string; "aria-hidden"?: boolean };

function DataSourcesAccordionSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: ComponentType<IconProps>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const regionId = `${baseId}-region`;

  return (
    <section className="glass overflow-hidden rounded-2xl border border-foreground/10 shadow-sm">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors duration-200 hover:bg-foreground/5"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex min-w-0 items-center gap-2 text-alpha">
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className="heading-brand text-base text-foreground">{title}</span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-text-secondary transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? "rotate-180" : "rotate-0"
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={regionId}
            role="region"
            aria-labelledby={triggerId}
            aria-hidden={!open}
            className={`border-t border-foreground/10 px-5 pb-5 pt-0 ${
              !open ? "pointer-events-none" : ""
            }`}
          >
            <div className="pt-4">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DataSourcesPanel() {
  const statusCtx = useDataSourcesStatusOptional();
  if (!statusCtx) {
    throw new Error(
      "DataSourcesPanel must be rendered inside DataSourcesStatusProvider",
    );
  }
  const { snapshot, refresh: refreshFromServer } = statusCtx;
  const presence = snapshot.credentialsPresent;
  const customEnvKeys = snapshot.customEnvKeys;
  const envLocalFileExists = snapshot.envLocalFileExists;
  const [editingCustomKey, setEditingCustomKey] = useState<string | null>(null);
  const [customEditValue, setCustomEditValue] = useState("");
  const [newCustomRows, setNewCustomRows] = useState<
    { id: string; name: string; value: string }[]
  >([]);
  const [pendingRemoval, setPendingRemoval] = useState(() => new Set<string>());
  const [form, setForm] = useState({
    ALPACA_API_KEY: "",
    ALPACA_SECRET_KEY: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  /** When true, show password fields for a provider even if keys are already stored. */
  const [alpacaEditMode, setAlpacaEditMode] = useState(false);

  const alpacaComplete =
    Boolean(presence.ALPACA_API_KEY) && Boolean(presence.ALPACA_SECRET_KEY);
  const showAlpacaFields = !alpacaComplete || alpacaEditMode;

  const refreshPresence = useCallback(async () => {
    await refreshFromServer();
    setPendingRemoval(new Set());
    setEditingCustomKey(null);
    setCustomEditValue("");
    setNewCustomRows([]);
    window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
  }, [refreshFromServer]);

  const removeReservedKey = useCallback(
    async (key: "POLYGON_API_KEY" | "TIINGO_API_KEY") => {
      setSaving(true);
      setSaveMsg(null);
      try {
        const res = await fetch("/api/data-sources/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: "" }),
        });
        if (!res.ok) {
          let msg = "Could not update .env.local.";
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          setSaveMsg(msg);
          return;
        }
        const saved = (await res.json()) as {
          jupyterSync?: "ok" | "skipped" | "failed";
          jupyterSyncError?: string;
        };
        if (saved.jupyterSync === "ok") {
          setSaveMsg("Removed from .env.local and synced to Jupyter.");
        } else if (saved.jupyterSync === "failed") {
          setSaveMsg(
            `Removed from .env.local. Jupyter sync failed (${saved.jupyterSyncError ?? "error"}).`,
          );
        } else {
          setSaveMsg("Removed from .env.local.");
        }
        await refreshPresence();
      } finally {
        setSaving(false);
      }
    },
    [refreshPresence],
  );

  const onSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    const managed: Partial<Record<ManagedSecretKey, string>> = {};
    (
      ["ALPACA_API_KEY", "ALPACA_SECRET_KEY"] as const satisfies readonly ManagedSecretKey[]
    ).forEach((k) => {
      const v = form[k].trim();
      if (v) managed[k] = v;
    });

    const custom: Record<string, string> = {};
    for (const k of pendingRemoval) {
      custom[k] = "";
    }
    if (editingCustomKey && customEditValue.trim()) {
      custom[editingCustomKey] = customEditValue.trim();
    }
    for (const row of newCustomRows) {
      const name = row.name.trim().toUpperCase();
      if (!name && !row.value.trim()) continue;
      const err = customEnvKeyNameError(name);
      if (err) {
        setSaveMsg(err);
        setSaving(false);
        return;
      }
      if (row.value.trim()) {
        custom[name] = row.value.trim();
      }
    }

    const payload: Record<string, unknown> = { ...managed };
    if (Object.keys(custom).length > 0) {
      payload.custom = custom;
    }

    try {
      const res = await fetch("/api/data-sources/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Could not save credentials. Check server logs.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setSaveMsg(msg);
        return;
      }
      const saved = (await res.json()) as {
        jupyterSync?: "ok" | "skipped" | "failed";
        jupyterSyncError?: string;
      };
      if (saved.jupyterSync === "ok") {
        setSaveMsg(
          "Saved to .env.local and synced into your Jupyter workspace. Run your next cell (or call load_data_source_secrets()) — no Docker restart needed.",
        );
      } else if (saved.jupyterSync === "skipped") {
        setSaveMsg(
          "Saved to .env.local. Jupyter sync was skipped (no server token). For kernels to see keys, restart the Jupyter container or set NEXT_PUBLIC_JUPYTER_TOKEN for the Next server.",
        );
      } else if (saved.jupyterSync === "failed") {
        setSaveMsg(
          `Saved to .env.local. Could not sync to Jupyter (${saved.jupyterSyncError ?? "error"}). Ensure Jupyter is running, then save again, or run docker compose restart jupyter.`,
        );
      } else {
        setSaveMsg("Saved to .env.local.");
      }
      setForm({
        ALPACA_API_KEY: "",
        ALPACA_SECRET_KEY: "",
      });
      setAlpacaEditMode(false);
      setCustomEditValue("");
      setEditingCustomKey(null);
      setNewCustomRows([]);
      setPendingRemoval(new Set());
      await refreshPresence();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 space-y-8">
      <DataSourcesAccordionSection title="API keys" icon={KeyRound} defaultOpen>
        <p className="mb-6 text-sm font-light text-text-secondary">
          Values are written only to{" "}
          <code className="font-mono-code text-[12px]">librequant/.env.local</code> on the machine
          running Next.js ({envLocalFileExists ? "file exists" : "file will be created"}). Secrets
          are not shown after save — use <strong className="font-medium text-text-primary">Edit</strong>{" "}
          to rotate a stored key.
        </p>

        <form onSubmit={onSaveCredentials} className="space-y-6">
          {/* Alpaca */}
          <div className="rounded-xl border border-foreground/8 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text-primary">Alpaca</h3>
              {alpacaComplete && !showAlpacaFields ? (
                <button
                  type="button"
                  onClick={() => {
                    setAlpacaEditMode(true);
                    setForm((f) => ({ ...f, ALPACA_API_KEY: "", ALPACA_SECRET_KEY: "" }));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-alpha/30 bg-alpha/10 px-3 py-1.5 text-xs font-medium text-alpha transition hover:bg-alpha/15"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit keys
                </button>
              ) : null}
            </div>
            {showAlpacaFields ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text-primary">ALPACA_API_KEY</span>
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={presence.ALPACA_API_KEY ? "New value to rotate" : "Required"}
                    value={form.ALPACA_API_KEY}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ALPACA_API_KEY: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text-primary">ALPACA_SECRET_KEY</span>
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={presence.ALPACA_SECRET_KEY ? "New value to rotate" : "Required"}
                    value={form.ALPACA_SECRET_KEY}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ALPACA_SECRET_KEY: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
                  />
                </label>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Keys are stored locally. Choose <strong className="text-text-primary">Edit keys</strong>{" "}
                above to replace them.
              </p>
            )}
            {alpacaComplete && showAlpacaFields ? (
              <button
                type="button"
                className="mt-3 text-xs font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
                onClick={() => {
                  setAlpacaEditMode(false);
                  setForm((f) => ({ ...f, ALPACA_API_KEY: "", ALPACA_SECRET_KEY: "" }));
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          {/* Polygon — connector not implemented in librequant.data yet */}
          <div className="rounded-xl border border-foreground/8 p-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Polygon{" "}
              <span className="font-normal text-text-secondary">(coming soon)</span>
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              The Python connector is not implemented yet —{" "}
              <code className="font-mono-code text-[12px]">get_bars(..., source=&quot;polygon&quot;)</code>{" "}
              will raise until it ships. You can add{" "}
              <code className="font-mono-code text-[12px]">POLYGON_API_KEY</code> manually in{" "}
              <code className="font-mono-code text-[12px]">librequant/.env.local</code> to reserve it.
            </p>
            {presence.POLYGON_API_KEY ? (
              <p className="mt-3 text-sm text-text-secondary">
                A value is present in <code className="font-mono-code text-[12px]">.env.local</code>{" "}
                (not used by <code className="font-mono-code text-[12px]">get_bars</code> yet).
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeReservedKey("POLYGON_API_KEY")}
                  className="ml-2 text-xs font-medium text-risk underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Remove key
                </button>
              </p>
            ) : null}
          </div>

          {/* Tiingo — connector not implemented in librequant.data yet */}
          <div className="rounded-xl border border-foreground/8 p-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Tiingo{" "}
              <span className="font-normal text-text-secondary">(coming soon)</span>
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              The Python connector is not implemented yet —{" "}
              <code className="font-mono-code text-[12px]">get_bars(..., source=&quot;tiingo&quot;)</code>{" "}
              will raise until it ships. You can add{" "}
              <code className="font-mono-code text-[12px]">TIINGO_API_KEY</code> manually in{" "}
              <code className="font-mono-code text-[12px]">librequant/.env.local</code> to reserve it.
            </p>
            {presence.TIINGO_API_KEY ? (
              <p className="mt-3 text-sm text-text-secondary">
                A value is present in <code className="font-mono-code text-[12px]">.env.local</code>{" "}
                (not used by <code className="font-mono-code text-[12px]">get_bars</code> yet).
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeReservedKey("TIINGO_API_KEY")}
                  className="ml-2 text-xs font-medium text-risk underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Remove key
                </button>
              </p>
            ) : null}
          </div>

          {/* Custom API keys */}
          <div className="rounded-xl border border-foreground/8 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Custom API keys</h3>
              <p className="mt-1 text-xs font-light leading-relaxed text-text-secondary">
                Add any uppercase env name (e.g. <code className="font-mono-code text-[11px]">MY_DATA_API_KEY</code>
                ) and secret. After saving, keys sync to Jupyter — use{" "}
                <code className="font-mono-code text-[11px]">load_data_source_secrets()</code> or call{" "}
                <code className="font-mono-code text-[11px]">get_bars</code> so <code className="font-mono-code text-[11px]">os.environ</code>{" "}
                is updated. Names cannot overlap built-in providers or{" "}
                <code className="font-mono-code text-[11px]">NEXT_PUBLIC_*</code>.
              </p>
            </div>

            <ul className="mb-4 space-y-2">
              {customEnvKeys
                .filter((k) => !pendingRemoval.has(k))
                .map((name) => (
                  <li
                    key={name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <code className="font-mono-code text-[13px] text-alpha">{name}</code>
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
                    <span className="mb-1 block font-medium text-text-primary">Variable name</span>
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
                    <span className="mb-1 block font-medium text-text-primary">Secret</span>
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

          <div className="flex flex-wrap items-center gap-3 border-t border-foreground/10 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-alpha px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save keys"
              )}
            </button>
            <button
              type="button"
              className="text-sm font-medium text-alpha underline-offset-4 hover:underline"
              onClick={() => void refreshPresence()}
            >
              Refresh status
            </button>
          </div>
        </form>
        {saveMsg ? (
          <p className="mt-4 text-sm text-text-secondary" role="status">
            {saveMsg}
          </p>
        ) : null}
      </DataSourcesAccordionSection>

      <DataSourcesAccordionSection title="Data library" icon={Upload} defaultOpen>
        <DataLibraryManager />
      </DataSourcesAccordionSection>
    </div>
  );
}
