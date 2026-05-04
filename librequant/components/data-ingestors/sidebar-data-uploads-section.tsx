"use client";

import {
  ChevronDown,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Folder,
  Loader2,
  RefreshCw,
} from "lucide-react";

import type { DataLibraryEntry } from "@/lib/jupyter-contents";

type SidebarUploadsTreeProps = {
  parentRel: string;
  depth: number;
  cache: Map<string, DataLibraryEntry[]>;
  expanded: Set<string>;
  loadingRels: Set<string>;
  onToggle: (rel: string) => void;
};

function childRelative(parentRel: string, name: string): string {
  return parentRel ? `${parentRel}/${name}` : name;
}

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

export function SidebarDataUploadsSection({
  dataFolderOpen,
  onToggleDataFolder,
  uploadsFolderOpen,
  onToggleUploadsFolder,
  uploadsBlocked,
  treeListLoading,
  treeListError,
  rootItems,
  rootItemCount,
  treeCache,
  treeExpanded,
  treeLoadingRels,
  onRefreshUploadsTree,
  onToggleTreeFolder,
}: {
  dataFolderOpen: boolean;
  onToggleDataFolder: () => void;
  uploadsFolderOpen: boolean;
  onToggleUploadsFolder: () => void;
  uploadsBlocked: boolean;
  treeListLoading: boolean;
  treeListError: string | null;
  rootItems: DataLibraryEntry[];
  rootItemCount: number;
  treeCache: Map<string, DataLibraryEntry[]>;
  treeExpanded: Set<string>;
  treeLoadingRels: Set<string>;
  onRefreshUploadsTree: () => void;
  onToggleTreeFolder: (rel: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggleDataFolder}
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
              onClick={onToggleUploadsFolder}
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
                void onRefreshUploadsTree();
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
                  onToggle={onToggleTreeFolder}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
