"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderPlus,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import { getNotebookLibraryRoot } from "@/lib/env";
import { listNotebookFolders } from "@/lib/jupyter-contents";
import type { NotebookFolderItem } from "@/lib/types/notebook";
import { notebookStemFromPath } from "@/lib/jupyter-paths";
import { usePersistedExpandedSet } from "@/lib/use-persisted-expanded-set";

const STORAGE_KEY = "librequant-sidebar-notebooks-expanded";

export function SidebarNotebookTree() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { serviceManager } = useJupyterServiceManager();
  const libraryRoot = getNotebookLibraryRoot();
  const [folders, setFolders] = useState<NotebookFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionOpen, setSectionOpen] = useState(true);
  const { expanded, togglePath: toggleFolder } = usePersistedExpandedSet(
    STORAGE_KEY,
  );

  const activeNotebookPath =
    pathname === "/"
      ? (() => {
          const raw = searchParams.get("path");
          try {
            return raw ? decodeURIComponent(raw) : null;
          } catch {
            return null;
          }
        })()
      : null;

  const refresh = useCallback(async () => {
    if (!serviceManager) return;
    setLoading(true);
    try {
      const list = await listNotebookFolders(
        serviceManager.contents,
        libraryRoot,
      );
      setFolders(list);
    } catch {
      /* sidebar tree is non-critical */
    } finally {
      setLoading(false);
    }
  }, [serviceManager, libraryRoot]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSection = () => setSectionOpen((v) => !v);

  const isNotebooksActive =
    pathname === "/notebooks" || activeNotebookPath !== null;

  const totalNotebooks = folders.reduce(
    (sum, f) => sum + f.notebooks.length,
    0,
  );

  return (
    <div className="mt-3 flex flex-col">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSection}
          className="flex shrink-0 items-center justify-center rounded p-0.5 text-text-secondary transition hover:text-text-primary"
          aria-label={sectionOpen ? "Collapse notebooks" : "Expand notebooks"}
        >
          {sectionOpen ? (
            <ChevronDown className="size-3" aria-hidden />
          ) : (
            <ChevronRight className="size-3" aria-hidden />
          )}
        </button>
        <Link
          href="/notebooks"
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:bg-foreground/5 ${
            isNotebooksActive
              ? "text-alpha"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Notebooks
        </Link>
      </div>

      {sectionOpen ? (
        <div className="ml-1.5 flex flex-col border-l border-foreground/8 pl-1">
          {loading && !folders.length ? (
            <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-text-secondary">
              <Loader2
                className="size-3 animate-spin text-alpha"
                aria-hidden
              />
              Loading…
            </div>
          ) : null}

          {!loading && totalNotebooks === 0 ? (
            <Link
              href="/notebooks"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-light text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
            >
              <FolderPlus className="size-3" aria-hidden />
              New notebook…
            </Link>
          ) : null}

          {folders.map((folder) => {
            const isRoot = folder.name === "";
            const isExpanded = isRoot || expanded.has(folder.path);

            if (isRoot) {
              return folder.notebooks.map((nb) => {
                const isActive = nb.path === activeNotebookPath;
                return (
                  <Link
                    key={nb.path}
                    href={`/?path=${encodeURIComponent(nb.path)}`}
                    className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-foreground/5 ${
                      isActive
                        ? "bg-alpha/8 text-alpha"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <FileText className="size-3 shrink-0" aria-hidden />
                    <span className="truncate text-[11px] font-light">
                      {notebookStemFromPath(nb.path)}
                    </span>
                  </Link>
                );
              });
            }

            return (
              <div key={folder.path} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.path)}
                  className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-left transition hover:bg-foreground/5"
                >
                  {isExpanded ? (
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
                  <BookOpen
                    className="size-3 shrink-0 text-alpha/70"
                    aria-hidden
                  />
                  <span className="truncate text-[11px] font-medium text-text-primary">
                    {folder.name}
                  </span>
                  {folder.notebooks.length > 0 ? (
                    <span className="ml-auto shrink-0 text-[9px] tabular-nums text-text-secondary">
                      {folder.notebooks.length}
                    </span>
                  ) : null}
                </button>

                {isExpanded && folder.notebooks.length > 0 ? (
                  <div className="ml-3 flex flex-col border-l border-foreground/6 pl-1">
                    {folder.notebooks.map((nb) => {
                      const isActive = nb.path === activeNotebookPath;
                      return (
                        <Link
                          key={nb.path}
                          href={`/?path=${encodeURIComponent(nb.path)}`}
                          className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-foreground/5 ${
                            isActive
                              ? "bg-alpha/8 text-alpha"
                              : "text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          <FileText
                            className="size-3 shrink-0"
                            aria-hidden
                          />
                          <span className="truncate font-mono-code text-[10px]">
                            {notebookStemFromPath(nb.path)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
