"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Folder,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useJupyterReachability } from "@/lib/jupyter-reachability-context";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import { useHasMounted } from "@/lib/use-has-mounted";
import {
  DATA_SOURCES_CHANGED_EVENT,
  getDataUploadsRelativePrefix,
} from "@/lib/data-sources/constants";
import type { ManagedSecretKey } from "@/lib/data-sources/custom-env-key";
import { useDataSourcesStatusOptional } from "@/lib/data-sources-status-context";
import { getNotebookLibraryRoot } from "@/lib/env";
import {
  listDataLibraryDirectory,
  type DataLibraryEntry,
} from "@/lib/jupyter-contents";

type CredentialsPresence = Record<ManagedSecretKey, boolean>;

function childRelative(parentRel: string, name: string): string {
  return parentRel ? `${parentRel}/${name}` : name;
}

type SidebarUploadsTreeProps = {
  parentRel: string;
  depth: number;
  cache: Map<string, DataLibraryEntry[]>;
  expanded: Set<string>;
  loadingRels: Set<string>;
  onToggle: (rel: string) => void;
};

function SidebarUploadsTree({
  parentRel,
  depth,
  cache,
  expanded,
  loadingRels,
  onToggle,
}: SidebarUploadsTreeProps) {
  const items = cache.get(parentRel);
  if (items === undefined) return null;

  return (
    <div role="group" className="flex flex-col">
      {items.map((entry) => {
        const rel = childRelative(parentRel, entry.name);
        const isDir = entry.type === "directory";
        const isOpen = expanded.has(rel);
        const loading = loadingRels.has(rel);
        const pad = depth > 0 ? 6 + depth * 8 : 0;

        return (
          <div key={entry.path}>
            {isDir ? (
              <button
                type="button"
                onClick={() => onToggle(rel)}
                className="flex w-full min-w-0 items-center gap-0.5 rounded py-0.5 text-left text-[10px] font-normal leading-snug text-text-primary transition hover:bg-foreground/5"
                style={{ paddingLeft: pad }}
              >
                {loading ? (
                  <Loader2
                    className="size-3 shrink-0 animate-spin text-alpha"
                    aria-hidden
                  />
                ) : isOpen ? (
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
                <Folder
                  className="size-3 shrink-0 text-alpha/70"
                  aria-hidden
                />
                <span className="truncate text-[10px] font-medium text-text-primary">
                  {entry.name}
                </span>
              </button>
            ) : (
              <div
                className="flex min-w-0 items-center gap-0.5 py-0.5 text-[10px] leading-snug text-text-secondary"
                style={{ paddingLeft: pad + 14 }}
              >
                <FileSpreadsheet
                  className="size-3 shrink-0 text-alpha/80"
                  aria-hidden
                />
                <span className="truncate font-mono-code text-[10px] text-text-secondary">
                  {entry.name}
                </span>
              </div>
            )}
            {isDir && isOpen ? (
              <div className="ml-1.5 border-l border-foreground/6 pl-1">
                <SidebarUploadsTree
                  parentRel={rel}
                  depth={depth + 1}
                  cache={cache}
                  expanded={expanded}
                  loadingRels={loadingRels}
                  onToggle={onToggle}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const EMPTY_CREDENTIALS_PRESENCE: CredentialsPresence = {
  ALPACA_API_KEY: false,
  ALPACA_SECRET_KEY: false,
  POLYGON_API_KEY: false,
  TIINGO_API_KEY: false,
};

export function SidebarDataIngestors() {
  const pathname = usePathname();
  const dataSourcesStatus = useDataSourcesStatusOptional();
  const { reachable } = useJupyterReachability();
  const { serviceManager, error: smError } = useJupyterServiceManager();
  const hasMounted = useHasMounted();
  const [sectionOpen, setSectionOpen] = useState(true);
  const [activeKeysOpen, setActiveKeysOpen] = useState(true);
  /** On routes without shared status, fetch locally; on `/data-sources` use provider snapshot. */
  const [statusLoading, setStatusLoading] = useState(
    () => dataSourcesStatus == null,
  );
  const [fallbackPresence, setFallbackPresence] =
    useState<CredentialsPresence>(EMPTY_CREDENTIALS_PRESENCE);
  const [fallbackCustomKeys, setFallbackCustomKeys] = useState<string[]>([]);

  const presence =
    dataSourcesStatus?.snapshot.credentialsPresent ?? fallbackPresence;
  const customEnvKeys =
    dataSourcesStatus?.snapshot.customEnvKeys ?? fallbackCustomKeys;
  const [dataFolderOpen, setDataFolderOpen] = useState(true);
  const [uploadsFolderOpen, setUploadsFolderOpen] = useState(true);

  const [treeCache, setTreeCache] = useState<Map<string, DataLibraryEntry[]>>(
    () => new Map(),
  );
  const [treeExpanded, setTreeExpanded] = useState<Set<string>>(
    () => new Set(),
  );
  const [treeLoadingRels, setTreeLoadingRels] = useState<Set<string>>(
    () => new Set(),
  );
  const [treeListLoading, setTreeListLoading] = useState(false);
  const [treeListError, setTreeListError] = useState<string | null>(null);

  const uploadsBlocked =
    !hasMounted || !reachable || !serviceManager || Boolean(smError);
  const uploadsPrefix = getDataUploadsRelativePrefix();
  const libraryRoot = getNotebookLibraryRoot();

  const alpacaComplete =
    Boolean(presence.ALPACA_API_KEY) && Boolean(presence.ALPACA_SECRET_KEY);
  const customCount = customEnvKeys.length;

  /** Active providers only: yfinance needs no key; others appear when configured. */
  const activeKeyRows = useMemo(() => {
    const rows: { id: string; label: string; count?: number }[] = [
      { id: "yfinance", label: "yfinance" },
    ];
    if (alpacaComplete) rows.push({ id: "alpaca", label: "Alpaca" });
    if (presence.POLYGON_API_KEY) {
      rows.push({ id: "polygon", label: "Polygon (reserved)" });
    }
    if (presence.TIINGO_API_KEY) {
      rows.push({ id: "tiingo", label: "Tiingo (reserved)" });
    }
    if (customCount > 0) {
      rows.push({ id: "custom", label: "Custom", count: customCount });
    }
    return rows;
  }, [
    alpacaComplete,
    presence.POLYGON_API_KEY,
    presence.TIINGO_API_KEY,
    customCount,
  ]);

  const rootItems = treeCache.get("") ?? [];
  const rootItemCount = rootItems.length;

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/data-sources/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        credentialsPresent: CredentialsPresence;
        customEnvKeys: string[];
      };
      setFallbackPresence(data.credentialsPresent);
      setFallbackCustomKeys(data.customEnvKeys);
    } catch {
      /* non-critical */
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadDir = useCallback(
    async (rel: string) => {
      if (!serviceManager || uploadsBlocked) return;
      setTreeLoadingRels((r) => new Set(r).add(rel));
      try {
        const list = await listDataLibraryDirectory(
          serviceManager.contents,
          libraryRoot,
          rel,
        );
        setTreeCache((c) => new Map(c).set(rel, list));
        setTreeListError(null);
      } catch (err) {
        console.error(err);
        setTreeListError("List failed");
      } finally {
        setTreeLoadingRels((r) => {
          const n = new Set(r);
          n.delete(rel);
          return n;
        });
      }
    },
    [serviceManager, uploadsBlocked, libraryRoot],
  );

  const refreshUploadsTree = useCallback(async () => {
    if (!serviceManager || uploadsBlocked) return;
    setTreeListLoading(true);
    setTreeListError(null);
    try {
      const rels = new Set<string>(["", ...treeExpanded]);
      const pairs = await Promise.all(
        [...rels].map(async (rel) => {
          const list = await listDataLibraryDirectory(
            serviceManager.contents,
            libraryRoot,
            rel,
          );
          return [rel, list] as const;
        }),
      );
      setTreeCache(new Map(pairs));
    } catch (err) {
      console.error(err);
      setTreeListError("List failed");
      setTreeCache(new Map());
    } finally {
      setTreeListLoading(false);
    }
  }, [serviceManager, uploadsBlocked, libraryRoot, treeExpanded]);

  const toggleTreeFolder = useCallback(
    (rel: string) => {
      setTreeExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(rel)) {
          next.delete(rel);
        } else {
          next.add(rel);
          void loadDir(rel);
        }
        return next;
      });
    },
    [loadDir],
  );

  useEffect(() => {
    if (dataSourcesStatus) {
      setStatusLoading(false);
      return;
    }
    void refreshStatus();
  }, [dataSourcesStatus, refreshStatus]);

  useEffect(() => {
    if (uploadsBlocked) return;
    void loadDir("");
  }, [uploadsBlocked, loadDir]);

  useEffect(() => {
    const onChanged = () => {
      if (!dataSourcesStatus) void refreshStatus();
      void refreshUploadsTree();
    };
    window.addEventListener(DATA_SOURCES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DATA_SOURCES_CHANGED_EVENT, onChanged);
  }, [dataSourcesStatus, refreshStatus, refreshUploadsTree]);

  const isDataSourcesActive = pathname === "/data-sources";

  const toggleSection = () => setSectionOpen((v) => !v);

  return (
    <div className="mt-3 flex flex-col">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSection}
          className="flex shrink-0 items-center justify-center rounded p-0.5 text-text-secondary transition hover:text-text-primary"
          aria-label={
            sectionOpen ? "Collapse data ingestors" : "Expand data ingestors"
          }
        >
          {sectionOpen ? (
            <ChevronDown className="size-3" aria-hidden />
          ) : (
            <ChevronRight className="size-3" aria-hidden />
          )}
        </button>
        <Link
          href="/data-sources"
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:bg-foreground/5 ${
            isDataSourcesActive
              ? "text-alpha"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Data Ingestors
        </Link>
      </div>

      {sectionOpen ? (
        <div className="ml-1.5 flex flex-col border-l border-foreground/8 pl-1">
          <button
            type="button"
            onClick={() => setActiveKeysOpen((v) => !v)}
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

          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setDataFolderOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-left transition hover:bg-foreground/5"
            >
              {dataFolderOpen ? (
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
              <Database
                className="size-3 shrink-0 text-alpha/70"
                aria-hidden
              />
              <span className="truncate text-[11px] font-medium text-text-primary">
                data
              </span>
            </button>

            {dataFolderOpen ? (
              <div className="ml-3 flex flex-col border-l border-foreground/6 pl-1">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setUploadsFolderOpen((v) => !v)}
                    className="flex min-w-0 flex-1 items-center gap-1 rounded-lg px-1.5 py-1 text-left transition hover:bg-foreground/5"
                  >
                    {uploadsFolderOpen ? (
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
                    <Folder
                      className="size-3 shrink-0 text-alpha/60"
                      aria-hidden
                    />
                    <span className="truncate text-[10px] font-medium text-text-primary">
                      uploads
                    </span>
                    {rootItemCount > 0 ? (
                      <span className="ml-auto shrink-0 text-[9px] tabular-nums text-text-secondary">
                        {rootItemCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(uploadsBlocked || treeListLoading)}
                    onClick={(e) => {
                      e.stopPropagation();
                      void refreshUploadsTree();
                    }}
                    className="shrink-0 rounded p-1 text-text-secondary transition hover:bg-foreground/5 hover:text-alpha disabled:opacity-40"
                    aria-label="Refresh uploads tree"
                  >
                    <RefreshCw
                      className={`size-3 ${treeListLoading ? "animate-spin" : ""}`}
                      aria-hidden
                    />
                  </button>
                </div>

                {uploadsFolderOpen ? (
                  <div className="ml-3 mt-0.5 max-h-48 flex-col overflow-y-auto overflow-x-hidden border-l border-foreground/6 pl-1 pr-0.5">
                    {uploadsBlocked ? (
                      <p className="px-1.5 py-1 text-[10px] font-light text-text-secondary">
                        Connect Jupyter for files.
                      </p>
                    ) : treeListError ? (
                      <p className="px-1.5 py-1 text-[10px] text-risk" role="alert">
                        {treeListError}
                      </p>
                    ) : treeListLoading && rootItems.length === 0 ? (
                      <div className="flex items-center gap-1.5 px-1.5 py-1 text-[10px] text-text-secondary">
                        <Loader2
                          className="size-3 animate-spin text-alpha"
                          aria-hidden
                        />
                        Loading…
                      </div>
                    ) : rootItems.length === 0 ? (
                      <p className="px-1.5 py-1 text-[10px] font-light text-text-secondary">
                        Empty — use Data library to add files.
                      </p>
                    ) : (
                      <SidebarUploadsTree
                        parentRel=""
                        depth={0}
                        cache={treeCache}
                        expanded={treeExpanded}
                        loadingRels={treeLoadingRels}
                        onToggle={toggleTreeFolder}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
