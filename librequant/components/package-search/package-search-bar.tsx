"use client";

import "@/lib/ensure-webpack-public-path";
import { useNotebookStore } from "@datalayer/jupyter-react";
import { Loader2, Package, Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { isSafePyPIProjectName } from "@/lib/pypi-name";

export type PyPIProjectSummary = {
  name: string;
  summary: string;
  version?: string;
};

type Props = {
  notebookId: string;
};

export function PackageSearchBar({ notebookId }: Props) {
  const notebookStore = useNotebookStore();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PyPIProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setMessage(null);
        try {
          const res = await fetch(
            `/api/pypi/search?q=${encodeURIComponent(query.trim())}`,
          );
          const data = (await res.json()) as {
            results?: PyPIProjectSummary[];
            error?: string;
          };
          if (cancelled) return;
          if (!res.ok) {
            setResults([]);
            setMessage({ kind: "err", text: data.error ?? "Search failed" });
            return;
          }
          setResults(data.results ?? []);
          setOpen(true);
        } catch {
          if (!cancelled) {
            setResults([]);
            setMessage({ kind: "err", text: "Could not reach package search." });
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const install = useCallback(
    async (rawName: string) => {
      const name = rawName.trim();
      if (!isSafePyPIProjectName(name)) {
        setMessage({ kind: "err", text: "Invalid package name." });
        return;
      }
      const adapter = notebookStore.selectNotebookAdapter(notebookId);
      if (!adapter) {
        setMessage({ kind: "err", text: "Notebook is not ready yet." });
        return;
      }
      setInstalling(name);
      setMessage(null);
      setOpen(false);
      try {
        const code = `%pip install ${name}`;
        const result = await adapter.executeCode(code, { timeout: 300 });
        if (!result.success) {
          setMessage({
            kind: "err",
            text: result.error ?? "Install failed (see kernel output).",
          });
          return;
        }
        const errOut = result.outputs?.find((o) => o.type === "error");
        if (errOut && errOut.type === "error") {
          const c = errOut.content as {
            evalue?: string;
            traceback?: string[];
          };
          const text =
            c.evalue?.trim() ||
            c.traceback?.slice(-4).join("\n") ||
            "pip reported an error.";
          setMessage({ kind: "err", text });
          return;
        }
        setMessage({
          kind: "ok",
          text: `Installed ${name} in the kernel environment.`,
        });
      } catch (e) {
        setMessage({
          kind: "err",
          text: e instanceof Error ? e.message : "Install failed.",
        });
      } finally {
        setInstalling(null);
      }
    },
    [notebookId, notebookStore],
  );

  return (
    <div
      ref={wrapRef}
      className="mb-4 rounded-xl border border-foreground/10 bg-background/40 px-3 py-2.5 backdrop-blur-sm"
    >
      <div className="flex items-start gap-2">
        <Package
          className="mt-0.5 size-4 shrink-0 text-brand-teal/90"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor={listId} className="sr-only">
            Search PyPI packages
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <input
              ref={inputRef}
              id={listId}
              type="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search PyPI (e.g. pandas, scikit-learn)…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length >= 2) setOpen(true);
              }}
              onFocus={() => {
                if (results.length > 0) setOpen(true);
              }}
              className="w-full rounded-lg border border-foreground/10 bg-background/80 py-2 pl-9 pr-10 text-sm text-foreground outline-none ring-brand-teal/30 placeholder:text-text-secondary focus:border-brand-teal/40 focus:ring-2"
            />
            {loading ? (
              <Loader2
                className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-secondary"
                aria-hidden
              />
            ) : null}
          </div>

          {open && results.length > 0 ? (
            <ul className="max-h-72 overflow-auto rounded-lg border border-foreground/10 bg-background py-1 shadow-sm">
              {results.map((p) => (
                <li
                  key={p.name}
                  className="border-b border-foreground/5 last:border-0"
                >
                  <div className="flex gap-2 px-2 py-2 text-left sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono-code text-sm text-foreground">
                        {p.name}
                      </p>
                      {p.version ? (
                        <p className="text-[10px] uppercase tracking-wide text-text-secondary">
                          {p.version}
                        </p>
                      ) : null}
                      {p.summary ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                          {p.summary}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 self-start rounded-lg border border-brand-teal/35 bg-brand-teal/10 px-2.5 py-1.5 text-xs font-medium text-brand-teal transition hover:bg-brand-teal/15 disabled:opacity-50 sm:self-center"
                      disabled={installing !== null}
                      onClick={() => void install(p.name)}
                    >
                      {installing === p.name ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        "Install"
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {message ? (
            <p
              className={`text-xs ${
                message.kind === "ok" ? "text-brand-teal" : "text-brand-rose"
              }`}
              role="status"
            >
              {message.text}
            </p>
          ) : (
            <p className="text-[11px] leading-snug text-text-secondary">
              Installs run in the Docker Jupyter environment via{" "}
              <code className="font-mono-code text-[10px] text-foreground/80">
                %pip install
              </code>
              . Large packages can take a minute.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
