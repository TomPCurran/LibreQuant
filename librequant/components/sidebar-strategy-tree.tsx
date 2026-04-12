"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode2,
  Folder,
  FolderPlus,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import { listStrategyDirectories } from "@/lib/strategy-contents";
import type { StrategyDirectoryItem, StrategyFileItem } from "@/lib/types/strategy";
import { usePersistedExpandedSet } from "@/lib/use-persisted-expanded-set";

function hasPyFiles(items: StrategyFileItem[]): boolean {
  return items.some(
    (f) =>
      (f.type === "file" && f.name.endsWith(".py")) ||
      (f.type === "directory" && f.children && hasPyFiles(f.children)),
  );
}

const STORAGE_KEY = "librequant-sidebar-strategies-expanded";

function SidebarFileItems({
  items,
  activePath,
  expanded,
  toggleDir,
}: {
  items: StrategyFileItem[];
  activePath: string | null;
  expanded: Set<string>;
  toggleDir: (path: string) => void;
}) {
  return (
    <>
      {items.map((item) => {
        if (item.type === "directory") {
          if (!item.children || !hasPyFiles(item.children)) return null;
          const isOpen = expanded.has(item.path);
          return (
            <div key={item.path} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleDir(item.path)}
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-left transition hover:bg-foreground/5"
              >
                {isOpen ? (
                  <ChevronDown className="size-3 shrink-0 text-text-secondary" aria-hidden />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-text-secondary" aria-hidden />
                )}
                <Folder className="size-3 shrink-0 text-alpha/60" aria-hidden />
                <span className="truncate text-[10px] font-medium text-text-primary">
                  {item.name}
                </span>
              </button>
              {isOpen ? (
                <div className="ml-3 flex flex-col border-l border-foreground/6 pl-1">
                  <SidebarFileItems
                    items={item.children}
                    activePath={activePath}
                    expanded={expanded}
                    toggleDir={toggleDir}
                  />
                </div>
              ) : null}
            </div>
          );
        }

        if (!item.name.endsWith(".py")) return null;
        const isActive = item.path === activePath;
        return (
          <Link
            key={item.path}
            href={`/strategies/edit?path=${encodeURIComponent(item.path)}`}
            className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-foreground/5 ${
              isActive
                ? "bg-alpha/8 text-alpha"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileCode2 className="size-3 shrink-0" aria-hidden />
            <span className="truncate font-mono-code text-[10px]">
              {item.name}
            </span>
          </Link>
        );
      })}
    </>
  );
}

export function SidebarStrategyTree() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { serviceManager } = useJupyterServiceManager();
  const [items, setItems] = useState<StrategyDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionOpen, setSectionOpen] = useState(true);
  const { expanded, togglePath: toggleDir } = usePersistedExpandedSet(
    STORAGE_KEY,
  );

  const activePath = pathname.startsWith("/strategies/edit")
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
      const list = await listStrategyDirectories(serviceManager.contents);
      setItems(list);
    } catch {
      /* sidebar tree is non-critical — fail silently */
    } finally {
      setLoading(false);
    }
  }, [serviceManager]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSection = () => setSectionOpen((v) => !v);

  const isStrategiesActive =
    pathname === "/strategies" || pathname.startsWith("/strategies/");

  return (
    <div className="mt-3 flex flex-col">
      {/* Section header — links to /strategies and toggles collapse */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSection}
          className="flex shrink-0 items-center justify-center rounded p-0.5 text-text-secondary transition hover:text-text-primary"
          aria-label={sectionOpen ? "Collapse strategies" : "Expand strategies"}
        >
          {sectionOpen ? (
            <ChevronDown className="size-3" aria-hidden />
          ) : (
            <ChevronRight className="size-3" aria-hidden />
          )}
        </button>
        <Link
          href="/strategies"
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:bg-foreground/5 ${
            isStrategiesActive
              ? "text-alpha"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Strategies
        </Link>
      </div>

      {sectionOpen ? (
        <div className="ml-1.5 flex flex-col border-l border-foreground/8 pl-1">
          {loading && !items.length ? (
            <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-text-secondary">
              <Loader2
                className="size-3 animate-spin text-alpha"
                aria-hidden
              />
              Loading…
            </div>
          ) : null}

          {!loading && !items.length ? (
            <Link
              href="/strategies"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-light text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
            >
              <FolderPlus className="size-3" aria-hidden />
              New strategy…
            </Link>
          ) : null}

          {items.map((dir) => {
            const isExpanded = expanded.has(dir.path);

            return (
              <div key={dir.path} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleDir(dir.path)}
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
                  <Code2
                    className="size-3 shrink-0 text-alpha/70"
                    aria-hidden
                  />
                  <span className="truncate text-[11px] font-medium text-text-primary">
                    {dir.meta?.name || dir.name}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="ml-3 flex flex-col border-l border-foreground/6 pl-1">
                    <SidebarFileItems
                      items={dir.files}
                      activePath={activePath}
                      expanded={expanded}
                      toggleDir={toggleDir}
                    />
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
