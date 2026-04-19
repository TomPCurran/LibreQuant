"use client";

import dynamic from "next/dynamic";
import { useCallback, useId, useMemo, useState, type ComponentType } from "react";
import {
  ChevronDown,
  Database,
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
  DEFAULT_DATABASE_URL_KEY,
  isUserDatabaseUrlKey,
  slugFromUserDatabaseUrlKey,
  userDatabaseSlugError,
  userDatabaseUrlEnvKey,
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
  const genericCustomKeys = useMemo(
    () => customEnvKeys.filter((k) => !isUserDatabaseUrlKey(k)),
    [customEnvKeys],
  );
  const userDatabaseUrlKeys = useMemo(
    () => customEnvKeys.filter((k) => isUserDatabaseUrlKey(k)).sort(),
    [customEnvKeys],
  );
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
  const [editingUserDbKey, setEditingUserDbKey] = useState<string | null>(null);
  const [userDbUrlDraft, setUserDbUrlDraft] = useState("");
  const [newUserDbSlug, setNewUserDbSlug] = useState("");
  const [newUserDbUrl, setNewUserDbUrl] = useState("");
  const [dbConnMsg, setDbConnMsg] = useState<string | null>(null);
  const [dbConnSaving, setDbConnSaving] = useState(false);

  const alpacaComplete =
    Boolean(presence.ALPACA_API_KEY) && Boolean(presence.ALPACA_SECRET_KEY);
  const showAlpacaFields = !alpacaComplete || alpacaEditMode;

  const refreshPresence = useCallback(async () => {
    await refreshFromServer();
    setPendingRemoval(new Set());
    setEditingCustomKey(null);
    setCustomEditValue("");
    setNewCustomRows([]);
    setEditingUserDbKey(null);
    setUserDbUrlDraft("");
    setNewUserDbSlug("");
    setNewUserDbUrl("");
    setDbConnMsg(null);
    window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
  }, [refreshFromServer]);

  const applyDbConnectionSaveResponse = useCallback(
    async (res: Response) => {
      if (!res.ok) {
        let msg = "Could not save database connection.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setDbConnMsg(msg);
        return;
      }
      const saved = (await res.json()) as {
        jupyterSync?: "ok" | "skipped" | "failed";
        jupyterSyncError?: string;
      };
      if (saved.jupyterSync === "ok") {
        setDbConnMsg(
          "Saved and synced to Jupyter. Run load_data_source_secrets() or your next data call.",
        );
      } else if (saved.jupyterSync === "skipped") {
        setDbConnMsg(
          "Saved to .env.local. Jupyter sync skipped — set NEXT_PUBLIC_JUPYTER_TOKEN or restart Jupyter to sync.",
        );
      } else if (saved.jupyterSync === "failed") {
        setDbConnMsg(
          `Saved locally. Jupyter sync failed (${saved.jupyterSyncError ?? "error"}).`,
        );
      } else {
        setDbConnMsg("Saved to .env.local.");
      }
      setEditingUserDbKey(null);
      setUserDbUrlDraft("");
      await refreshFromServer();
      window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
    },
    [refreshFromServer],
  );

  const postUserDbCustom = useCallback(
    async (custom: Record<string, string>) => {
      setDbConnSaving(true);
      setDbConnMsg(null);
      try {
        const res = await fetch("/api/data-sources/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custom }),
        });
        await applyDbConnectionSaveResponse(res);
      } finally {
        setDbConnSaving(false);
      }
    },
    [applyDbConnectionSaveResponse],
  );

  const saveNewUserDatabase = useCallback(async () => {
    const slugErr = userDatabaseSlugError(newUserDbSlug);
    if (slugErr) {
      setDbConnMsg(slugErr);
      return;
    }
    const envKey = userDatabaseUrlEnvKey(newUserDbSlug);
    const v = newUserDbUrl.trim();
    if (!v) {
      setDbConnMsg(
        "Enter a connection string (any database URL, e.g. postgresql://… or mysql://…).",
      );
      return;
    }
    if (userDatabaseUrlKeys.includes(envKey)) {
      setDbConnMsg("A connection with this name already exists.");
      return;
    }
    await postUserDbCustom({ [envKey]: v });
    setNewUserDbSlug("");
    setNewUserDbUrl("");
  }, [newUserDbSlug, newUserDbUrl, userDatabaseUrlKeys, postUserDbCustom]);

  const saveEditedUserDatabase = useCallback(async () => {
    if (!editingUserDbKey) return;
    const v = userDbUrlDraft.trim();
    if (!v) {
      setDbConnMsg(
        "Enter a connection string (any database URL, e.g. postgresql://… or mysql://…).",
      );
      return;
    }
    await postUserDbCustom({ [editingUserDbKey]: v });
  }, [editingUserDbKey, userDbUrlDraft, postUserDbCustom]);

  const removeUserDatabase = useCallback(
    async (envKey: string) => {
      await postUserDbCustom({ [envKey]: "" });
    },
    [postUserDbCustom],
  );

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
                ) and secret.                 Do not use <code className="font-mono-code text-[11px]">LIBREQUANT_DATABASE_URL</code> or{" "}
                <code className="font-mono-code text-[11px]">LIBREQUANT_DB_*_URL</code> — use{" "}
                <strong className="font-medium text-text-primary">Database connections</strong> below.
                After saving, keys sync to Jupyter — use{" "}
                <code className="font-mono-code text-[11px]">load_data_source_secrets()</code> or call{" "}
                <code className="font-mono-code text-[11px]">get_bars</code> so <code className="font-mono-code text-[11px]">os.environ</code>{" "}
                is updated. Names cannot overlap built-in providers or{" "}
                <code className="font-mono-code text-[11px]">NEXT_PUBLIC_*</code>.
              </p>
            </div>

            <ul className="mb-4 space-y-2">
              {genericCustomKeys
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

      <DataSourcesAccordionSection title="PostgreSQL" icon={Database} defaultOpen>
        <p className="mb-4 text-sm font-light text-text-secondary">
          Local PostgreSQL is defined in the repo root{" "}
          <code className="font-mono-code text-[12px]">docker-compose.yml</code>{" "}
          <code className="font-mono-code text-[12px]">postgres</code> service. Defaults are user{" "}
          <code className="font-mono-code text-[12px]">librequant</code> and password{" "}
          <code className="font-mono-code text-[12px]">librequant</code> (local dev only). Override{" "}
          <code className="font-mono-code text-[12px]">POSTGRES_USER</code> /{" "}
          <code className="font-mono-code text-[12px]">POSTGRES_PASSWORD</code> in repo-root{" "}
          <code className="font-mono-code text-[12px]">.env</code> if needed (see{" "}
          <code className="font-mono-code text-[12px]">env.docker.example</code>
          ). Values are not shown in this UI.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">Database:</strong>{" "}
            <code className="font-mono-code text-[12px]">librequant</code>. The bootstrap user is a{" "}
            <strong className="font-medium text-text-primary">PostgreSQL superuser</strong> (full
            admin) for local development.
          </li>
          <li>
            <strong className="font-medium text-text-primary">SQL clients on this machine:</strong>{" "}
            <code className="font-mono-code text-[12px]">127.0.0.1</code>, port{" "}
            <code className="font-mono-code text-[12px]">5432</code> by default (set{" "}
            <code className="font-mono-code text-[12px]">POSTGRES_HOST_PORT</code> in repo-root{" "}
            <code className="font-mono-code text-[12px]">.env</code> if that port is already in use, e.g.{" "}
            <code className="font-mono-code text-[12px]">5433</code>), database{" "}
            <code className="font-mono-code text-[12px]">librequant</code>, user and password match
            the Compose defaults or your repo-root <code className="font-mono-code text-[12px]">.env</code>{" "}
            overrides. If you set a custom password, avoid URL characters{" "}
            <code className="font-mono-code text-[11px]">@ : / ? # %</code> in{" "}
            <code className="font-mono-code text-[12px]">LIBREQUANT_DATABASE_URL</code> or encode it.
          </li>
          <li>
            <strong className="font-medium text-text-primary">Default in notebooks (Docker):</strong>{" "}
            Compose sets <code className="font-mono-code text-[12px]">{DEFAULT_DATABASE_URL_KEY}</code>{" "}
            (host <code className="font-mono-code text-[12px]">postgres</code>). Do not set that name in{" "}
            <code className="font-mono-code text-[12px]">.env.local</code> — it is reserved for this service.
            Use <code className="font-mono-code text-[12px]">librequant.data.get_database_url()</code> or{" "}
            <code className="font-mono-code text-[12px]">read_sql_frame()</code> for the default DB; use{" "}
            <code className="font-mono-code text-[12px]">get_database_url(&quot;SLUG&quot;)</code> for additional
            connections below.
          </li>
        </ul>
      </DataSourcesAccordionSection>

      <DataSourcesAccordionSection title="Database connections" icon={Database} defaultOpen>
        <p className="mb-6 text-sm font-light text-text-secondary">
          The default URL is <code className="font-mono-code text-[12px]">{DEFAULT_DATABASE_URL_KEY}</code> from Docker Compose (PostgreSQL). Add named connections here with any database URL you need (PostgreSQL, MySQL, SQLite, etc.); each becomes{" "}
          <code className="font-mono-code text-[12px]">LIBREQUANT_DB_{"{NAME}"}_URL</code>, syncs to Jupyter, and is
          loaded with <code className="font-mono-code text-[12px]">load_data_source_secrets()</code>. The{" "}
          <code className="font-mono-code text-[12px]">read_sql_frame</code> helper is PostgreSQL-only; use{" "}
          <code className="font-mono-code text-[12px]">get_database_url(&quot;SLUG&quot;)</code> with other drivers in code.
        </p>

        <div className="mb-6 rounded-xl border border-foreground/8 p-4">
          <h3 className="text-sm font-semibold text-text-primary">Default (Docker Postgres)</h3>
          <p className="mt-2 text-sm text-text-secondary">
            <code className="font-mono-code text-[12px]">{DEFAULT_DATABASE_URL_KEY}</code> is injected by{" "}
            <code className="font-mono-code text-[12px]">docker-compose.yml</code>. Not editable here.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Additional connections</h3>
          {userDatabaseUrlKeys.length > 0 ? (
            <ul className="space-y-3">
              {userDatabaseUrlKeys.map((envKey) => {
                const slug = slugFromUserDatabaseUrlKey(envKey) ?? envKey;
                const isEditing = editingUserDbKey === envKey;
                return (
                  <li
                    key={envKey}
                    className="rounded-xl border border-foreground/8 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-text-primary">{slug}</span>
                        <p className="mt-0.5 font-mono-code text-[11px] text-text-secondary">
                          {envKey}
                        </p>
                      </div>
                      {!isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserDbKey(envKey);
                              setUserDbUrlDraft("");
                              setDbConnMsg(null);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-alpha/30 bg-alpha/10 px-3 py-1.5 text-xs font-medium text-alpha transition hover:bg-alpha/15"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Edit URL
                          </button>
                          <button
                            type="button"
                            disabled={dbConnSaving}
                            onClick={() => void removeUserDatabase(envKey)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-risk/40 hover:text-risk disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium text-text-primary">
                            New connection string
                          </span>
                          <textarea
                            autoComplete="off"
                            spellCheck={false}
                            rows={3}
                            placeholder="postgresql://… or mysql://… or other database URL"
                            value={userDbUrlDraft}
                            onChange={(e) => setUserDbUrlDraft(e.target.value)}
                            className="mt-1 w-full max-w-2xl rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={dbConnSaving}
                            onClick={() => void saveEditedUserDatabase()}
                            className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-full bg-alpha px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                          >
                            {dbConnSaving ? (
                              <>
                                <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden />
                                Saving…
                              </>
                            ) : (
                              "Save"
                            )}
                          </button>
                          <button
                            type="button"
                            className="text-sm font-medium text-text-secondary hover:text-text-primary"
                            onClick={() => {
                              setEditingUserDbKey(null);
                              setUserDbUrlDraft("");
                              setDbConnMsg(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary">URL stored locally — use Edit to rotate.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No additional connections yet.</p>
          )}

          <div className="rounded-xl border border-dashed border-foreground/15 p-4">
            <h4 className="text-sm font-semibold text-text-primary">Add connection</h4>
            <p className="mt-1 text-xs text-text-secondary">
              Choose a short name (letters, numbers, underscore). Example:{" "}
              <code className="font-mono-code text-[11px]">STAGING</code> →{" "}
              <code className="font-mono-code text-[11px]">LIBREQUANT_DB_STAGING_URL</code>. Paste any standard
              connection URL for your database product.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-text-primary">Connection name</span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="STAGING"
                  value={newUserDbSlug}
                  onChange={(e) => setNewUserDbSlug(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-text-primary">Connection string</span>
                <textarea
                  autoComplete="off"
                  spellCheck={false}
                  rows={2}
                  placeholder="postgresql://… or mysql://…"
                  value={newUserDbUrl}
                  onChange={(e) => setNewUserDbUrl(e.target.value)}
                  className="mt-1 w-full max-w-2xl rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={dbConnSaving}
              onClick={() => void saveNewUserDatabase()}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-alpha/30 bg-alpha/10 px-4 text-sm font-medium text-alpha transition hover:bg-alpha/15 disabled:opacity-50"
            >
              <Plus className="mr-2 size-4" aria-hidden />
              Add connection
            </button>
          </div>
        </div>
        {dbConnMsg ? (
          <p className="mt-4 text-sm text-text-secondary" role="status">
            {dbConnMsg}
          </p>
        ) : null}
      </DataSourcesAccordionSection>

      <DataSourcesAccordionSection title="Data library" icon={Upload} defaultOpen>
        <DataLibraryManager />
      </DataSourcesAccordionSection>
    </div>
  );
}
