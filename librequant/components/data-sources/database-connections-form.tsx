"use client";

import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  DEFAULT_DATABASE_URL_KEY,
  slugFromUserDatabaseUrlKey,
} from "@/lib/data-sources/custom-env-key";

import type { CredentialSaveState } from "./use-credential-save";

type DatabaseConnectionsFormProps = {
  cred: CredentialSaveState;
};

export function DatabaseConnectionsForm({
  cred,
}: DatabaseConnectionsFormProps) {
  const {
    userDatabaseUrlKeys,
    editingUserDbKey,
    setEditingUserDbKey,
    userDbUrlDraft,
    setUserDbUrlDraft,
    dbConnSaving,
    saveNewUserDatabase,
    saveEditedUserDatabase,
    removeUserDatabase,
    newUserDbSlug,
    setNewUserDbSlug,
    newUserDbUrl,
    setNewUserDbUrl,
    dbConnMsg,
    setDbConnMsg,
  } = cred;

  return (
    <>
      <p className="mb-6 text-sm font-light text-text-secondary">
        The default URL is{" "}
        <code className="font-mono-code text-[12px]">
          {DEFAULT_DATABASE_URL_KEY}
        </code>{" "}
        from Docker Compose (PostgreSQL). Add named connections here with any
        database URL you need (PostgreSQL, MySQL, SQLite, etc.); each becomes{" "}
        <code className="font-mono-code text-[12px]">
          LIBREQUANT_DB_{"{NAME}"}_URL
        </code>
        , syncs to Jupyter, and is loaded with{" "}
        <code className="font-mono-code text-[12px]">
          load_data_source_secrets()
        </code>
        . The{" "}
        <code className="font-mono-code text-[12px]">read_sql_frame</code> helper is
        PostgreSQL-only; use{" "}
        <code className="font-mono-code text-[12px]">
          get_database_url(&quot;SLUG&quot;)
        </code>{" "}
        with other drivers in code.
      </p>

      <div className="mb-6 rounded-xl border border-foreground/8 p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Default (Docker Postgres)
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          <code className="font-mono-code text-[12px]">
            {DEFAULT_DATABASE_URL_KEY}
          </code>{" "}
          is injected by{" "}
          <code className="font-mono-code text-[12px]">docker-compose.yml</code>.
          Not editable here.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Additional connections
        </h3>
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
                      <span className="text-sm font-semibold text-text-primary">
                        {slug}
                      </span>
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
                              <RefreshCw
                                className="mr-2 size-4 animate-spin"
                                aria-hidden
                              />
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
                    <p className="text-sm text-text-secondary">
                      URL stored locally — use Edit to rotate.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">
            No additional connections yet.
          </p>
        )}

        <div className="rounded-xl border border-dashed border-foreground/15 p-4">
          <h4 className="text-sm font-semibold text-text-primary">
            Add connection
          </h4>
          <p className="mt-1 text-xs text-text-secondary">
            Choose a short name (letters, numbers, underscore). Example:{" "}
            <code className="font-mono-code text-[11px]">STAGING</code> →{" "}
            <code className="font-mono-code text-[11px]">
              LIBREQUANT_DB_STAGING_URL
            </code>
            . Paste any standard connection URL for your database product.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text-primary">
                Connection name
              </span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="STAGING"
                value={newUserDbSlug}
                onChange={(e) =>
                  setNewUserDbSlug(e.target.value.toUpperCase())
                }
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-text-primary">
                Connection string
              </span>
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
    </>
  );
}
