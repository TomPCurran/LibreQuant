"use client";

import { useCallback, useMemo, useState } from "react";

import { DATA_SOURCES_CHANGED_EVENT } from "@/lib/data-sources/constants";
import {
  customEnvKeyNameError,
  isUserDatabaseUrlKey,
  type ManagedSecretKey,
  userDatabaseSlugError,
  userDatabaseUrlEnvKey,
} from "@/lib/data-sources/custom-env-key";

import { useCredentialStatus } from "./use-credential-status";

export function useCredentialSave() {
  const { snapshot, refresh: refreshFromServer } = useCredentialStatus();
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

  const onSaveCredentials = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setSaveMsg(null);

      const managed: Partial<Record<ManagedSecretKey, string>> = {};
      (
        [
          "ALPACA_API_KEY",
          "ALPACA_SECRET_KEY",
        ] as const satisfies readonly ManagedSecretKey[]
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
    },
    [
      form,
      pendingRemoval,
      editingCustomKey,
      customEditValue,
      newCustomRows,
      refreshPresence,
    ],
  );

  return {
    presence,
    genericCustomKeys,
    userDatabaseUrlKeys,
    envLocalFileExists,
    editingCustomKey,
    setEditingCustomKey,
    customEditValue,
    setCustomEditValue,
    newCustomRows,
    setNewCustomRows,
    pendingRemoval,
    setPendingRemoval,
    form,
    setForm,
    saving,
    saveMsg,
    alpacaEditMode,
    setAlpacaEditMode,
    editingUserDbKey,
    setEditingUserDbKey,
    userDbUrlDraft,
    setUserDbUrlDraft,
    newUserDbSlug,
    setNewUserDbSlug,
    newUserDbUrl,
    setNewUserDbUrl,
    dbConnMsg,
    setDbConnMsg,
    dbConnSaving,
    alpacaComplete,
    showAlpacaFields,
    refreshPresence,
    removeReservedKey,
    onSaveCredentials,
    saveNewUserDatabase,
    saveEditedUserDatabase,
    removeUserDatabase,
  };
}

export type CredentialSaveState = ReturnType<typeof useCredentialSave>;
