"use client";

import "@/lib/ensure-webpack-public-path";
import type { ServiceManager } from "@jupyterlab/services";
import { Loader2, Package, Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { RunNotebookPipInstall } from "@/components/package-search/notebook-pip-types";
import { PackageSearchResults } from "@/components/package-search/package-search-results";
import { runPackageInstall } from "@/components/package-search/run-package-install";
import { isSafePyPIProjectName } from "@/lib/pypi-name";
import type { PyPIProjectSummary } from "@/lib/types/pypi";

type Props = {
  /**
   * When provided (from the notebook workbench), runs `%pip` on the active notebook kernel.
   * If this returns `null`, the panel falls back to {@link serviceManager} when set.
   */
  runNotebookPipInstall?: RunNotebookPipInstall;
  /**
   * Used when there is no notebook adapter (e.g. strategy editor), or as fallback when
   * `runNotebookPipInstall` returns `null`: run `%pip install` on a short-lived Jupyter kernel.
   */
  serviceManager?: ServiceManager.IManager | null;
  className?: string;
  /** Focus search input on mount (e.g. when modal opens) */
  autoFocus?: boolean;
};

export function PackageSearchPanel({
  runNotebookPipInstall,
  serviceManager = null,
  className = "",
  autoFocus = false,
}: Props) {
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
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(() => {
      void (async () => {
        const { signal } = ac;
        setLoading(true);
        setMessage(null);
        try {
          const res = await fetch(
            `/api/pypi/search?q=${encodeURIComponent(query.trim())}`,
            { signal },
          );
          const data = (await res.json()) as {
            results?: PyPIProjectSummary[];
            error?: string;
          };
          if (signal.aborted) return;
          if (!res.ok) {
            setResults([]);
            setMessage({ kind: "err", text: data.error ?? "Search failed" });
            return;
          }
          setResults(data.results ?? []);
          setOpen(true);
        } catch (e) {
          if (signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
            return;
          }
          setResults([]);
          setMessage({ kind: "err", text: "Could not reach package search." });
        } finally {
          if (!signal.aborted) setLoading(false);
        }
      })();
    }, 350);
    return () => {
      window.clearTimeout(t);
      ac.abort();
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
      if (!runNotebookPipInstall && !serviceManager) {
        setMessage({
          kind: "err",
          text: "Jupyter is not connected.",
        });
        return;
      }

      setInstalling(name);
      setMessage(null);
      setOpen(false);
      try {
        const outcome = await runPackageInstall(
          name,
          runNotebookPipInstall,
          serviceManager,
        );
        setMessage(
          outcome.ok
            ? { kind: "ok", text: outcome.text }
            : { kind: "err", text: outcome.text },
        );
      } catch (e) {
        setMessage({
          kind: "err",
          text: e instanceof Error ? e.message : "Install failed.",
        });
      } finally {
        setInstalling(null);
      }
    },
    [runNotebookPipInstall, serviceManager],
  );

  return (
    <div ref={wrapRef} className={className}>
      <div className="flex items-start gap-3">
        <Package
          className="mt-1 size-4 shrink-0 text-text-secondary"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor={listId} className="sr-only">
            Search PyPI packages
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
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
              className="w-full rounded-full border border-foreground/10 bg-background py-2.5 pl-10 pr-11 text-sm font-light text-foreground outline-none transition placeholder:text-text-secondary focus-visible:border-alpha/40 focus-visible:ring-2 focus-visible:ring-alpha/25"
            />
            {loading ? (
              <Loader2
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-secondary"
                aria-hidden
              />
            ) : null}
          </div>

          {open ? (
            <PackageSearchResults
              results={results}
              installing={installing}
              onInstall={install}
            />
          ) : null}

          {message ? (
            <p
              className={`text-xs font-light ${
                message.kind === "ok" ? "text-alpha" : "text-risk"
              }`}
              role="status"
            >
              {message.text}
            </p>
          ) : (
            <p className="text-xs font-light leading-relaxed text-text-secondary">
              Installs run in the Docker Jupyter environment via{" "}
              <code className="font-mono-code text-[12px] text-text-primary">
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
