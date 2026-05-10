"use client";

import { Pencil } from "lucide-react";

import type { CredentialSaveState } from "./use-credential-save";

type ManagedCredentialsFormProps = {
  cred: CredentialSaveState;
};

export function ManagedCredentialsForm({ cred }: ManagedCredentialsFormProps) {
  const {
    presence,
    form,
    setForm,
    alpacaComplete,
    showAlpacaFields,
    setAlpacaEditMode,
    saving,
    removeReservedKey,
  } = cred;

  return (
    <>
      <div className="rounded-xl border border-foreground/8 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Alpaca</h3>
          {alpacaComplete && !showAlpacaFields ? (
            <button
              type="button"
              onClick={() => {
                setAlpacaEditMode(true);
                setForm((f) => ({
                  ...f,
                  ALPACA_API_KEY: "",
                  ALPACA_SECRET_KEY: "",
                }));
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
              <span className="mb-1 block font-medium text-text-primary">
                ALPACA_API_KEY
              </span>
              <input
                type="password"
                autoComplete="off"
                placeholder={
                  presence.ALPACA_API_KEY ? "New value to rotate" : "Required"
                }
                value={form.ALPACA_API_KEY}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ALPACA_API_KEY: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text-primary">
                ALPACA_SECRET_KEY
              </span>
              <input
                type="password"
                autoComplete="off"
                placeholder={
                  presence.ALPACA_SECRET_KEY
                    ? "New value to rotate"
                    : "Required"
                }
                value={form.ALPACA_SECRET_KEY}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    ALPACA_SECRET_KEY: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-sm text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/70 focus-visible:ring-2"
              />
            </label>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Keys are stored locally. Choose{" "}
            <strong className="text-text-primary">Edit keys</strong> above to
            replace them.
          </p>
        )}
        {alpacaComplete && showAlpacaFields ? (
          <button
            type="button"
            className="mt-3 text-xs font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
            onClick={() => {
              setAlpacaEditMode(false);
              setForm((f) => ({
                ...f,
                ALPACA_API_KEY: "",
                ALPACA_SECRET_KEY: "",
              }));
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-foreground/8 p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Polygon{" "}
          <span className="font-normal text-text-secondary">(coming soon)</span>
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          The Python connector is not implemented yet —{" "}
          <code className="font-mono-code text-[12px]">
            get_bars(..., source=&quot;polygon&quot;)
          </code>{" "}
          will raise until it ships. You can add{" "}
          <code className="font-mono-code text-[12px]">POLYGON_API_KEY</code>{" "}
          manually in{" "}
          <code className="font-mono-code text-[12px]">librequant/.env.local</code>{" "}
          to reserve it.
        </p>
        {presence.POLYGON_API_KEY ? (
          <p className="mt-3 text-sm text-text-secondary">
            A value is present in{" "}
            <code className="font-mono-code text-[12px]">.env.local</code> (not
            used by{" "}
            <code className="font-mono-code text-[12px]">get_bars</code> yet).
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

      <div className="rounded-xl border border-foreground/8 p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Tiingo{" "}
          <span className="font-normal text-text-secondary">(coming soon)</span>
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          The Python connector is not implemented yet —{" "}
          <code className="font-mono-code text-[12px]">
            get_bars(..., source=&quot;tiingo&quot;)
          </code>{" "}
          will raise until it ships. You can add{" "}
          <code className="font-mono-code text-[12px]">TIINGO_API_KEY</code>{" "}
          manually in{" "}
          <code className="font-mono-code text-[12px]">librequant/.env.local</code>{" "}
          to reserve it.
        </p>
        {presence.TIINGO_API_KEY ? (
          <p className="mt-3 text-sm text-text-secondary">
            A value is present in{" "}
            <code className="font-mono-code text-[12px]">.env.local</code> (not
            used by{" "}
            <code className="font-mono-code text-[12px]">get_bars</code> yet).
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
    </>
  );
}
