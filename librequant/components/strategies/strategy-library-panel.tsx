"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Code2,
  FileCode2,
  FolderPlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import {
  buildImportSnippet,
  createStrategyDirectory,
  createStrategyFile,
  deleteStrategyDirectory,
  deleteStrategyFile,
  listStrategyDirectories,
} from "@/lib/strategy-contents";
import type { StrategyDirectoryItem } from "@/lib/types/strategy";

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(t);
}

export function StrategyLibraryPanel() {
  const router = useRouter();
  const { serviceManager, error: mgrError } = useJupyterServiceManager();
  const [items, setItems] = useState<StrategyDirectoryItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newStrategyName, setNewStrategyName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFileDir, setNewFileDir] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!serviceManager) return;
    setListError(null);
    setLoading(true);
    try {
      const list = await listStrategyDirectories(serviceManager.contents);
      setItems(list);
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Failed to list strategies.",
      );
    } finally {
      setLoading(false);
    }
  }, [serviceManager]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const onCreateStrategy = async () => {
    if (!serviceManager || !newStrategyName.trim()) return;
    setBusyAction("new");
    try {
      const dirPath = await createStrategyDirectory(
        serviceManager.contents,
        newStrategyName,
      );
      setNewStrategyName("");
      setShowNewForm(false);
      await refresh();
      setExpanded((prev) => new Set(prev).add(dirPath));
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Could not create strategy.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const onAddFile = async (dirPath: string) => {
    if (!serviceManager || !newFileName.trim()) return;
    setBusyAction("add-file");
    try {
      await createStrategyFile(
        serviceManager.contents,
        dirPath,
        newFileName,
      );
      setNewFileName("");
      setNewFileDir(null);
      await refresh();
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Could not create file.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const onDeleteDir = async (dirPath: string) => {
    if (!serviceManager) return;
    if (!window.confirm("Delete this strategy and all its files? This cannot be undone."))
      return;
    setBusyAction("delete");
    try {
      await deleteStrategyDirectory(serviceManager.contents, dirPath);
      await refresh();
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Delete failed.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const onDeleteFile = async (filePath: string) => {
    if (!serviceManager) return;
    if (!window.confirm("Delete this file? This cannot be undone.")) return;
    setBusyAction("delete");
    try {
      await deleteStrategyFile(serviceManager.contents, filePath);
      await refresh();
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Delete failed.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const onCopyImport = async (filePath: string) => {
    const snippet = buildImportSnippet(filePath);
    await navigator.clipboard.writeText(snippet);
    setCopiedPath(filePath);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const onOpenFile = (filePath: string) => {
    router.push(`/strategies/edit?path=${encodeURIComponent(filePath)}`);
  };

  const combinedError = mgrError ?? listError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-light leading-relaxed text-text-secondary">
          Strategy modules live under{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            strategies/
          </code>{" "}
          on your Jupyter server. Each strategy is a directory with{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            .py
          </code>{" "}
          files you can import into notebooks.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {showNewForm ? (
            <div className="flex items-center gap-2">
              <input
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                placeholder="strategy_name"
                className="min-w-[180px] rounded-full border border-foreground/12 bg-background/80 px-3 py-2 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
                aria-label="New strategy directory name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onCreateStrategy();
                  if (e.key === "Escape") {
                    setShowNewForm(false);
                    setNewStrategyName("");
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void onCreateStrategy()}
                disabled={
                  !serviceManager ||
                  busyAction !== null ||
                  !newStrategyName.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-alpha px-4 py-2 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90 disabled:opacity-50"
              >
                {busyAction === "new" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(false);
                  setNewStrategyName("");
                }}
                className="rounded-full border border-foreground/12 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              disabled={!serviceManager || busyAction !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-alpha px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90 disabled:opacity-50"
            >
              <FolderPlus className="size-4" aria-hidden />
              New Strategy
            </button>
          )}
        </div>
      </div>

      {combinedError ? (
        <div
          className="rounded-3xl border border-risk/30 bg-risk/5 px-4 py-3 text-sm font-light text-risk"
          role="alert"
        >
          {combinedError}
        </div>
      ) : null}

      {loading && !items.length ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm font-light text-text-secondary">
          <Loader2
            className="mr-2 size-5 animate-spin text-alpha"
            aria-hidden
          />
          Loading strategies…
        </div>
      ) : null}

      {!loading && !items.length && !combinedError ? (
        <div className="glass rounded-4xl p-8 text-center">
          <p className="heading-brand text-lg text-text-primary">
            No strategies yet
          </p>
          <p className="mt-2 text-sm font-light text-text-secondary">
            Create a new strategy to get started. Each strategy is a directory
            with Python files you can edit and import into notebooks.
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((dir) => {
            const isExpanded = expanded.has(dir.path);
            const pyFiles = dir.files.filter(
              (f) => f.type === "file" && f.name.endsWith(".py"),
            );
            const otherFiles = dir.files.filter(
              (f) =>
                f.type === "file" &&
                !f.name.endsWith(".py") &&
                f.name !== "meta.json",
            );

            return (
              <div key={dir.path} className="glass rounded-3xl">
                <div className="flex items-center gap-3 px-4 py-4">
                  <button
                    type="button"
                    onClick={() => toggleExpand(dir.path)}
                    className="flex shrink-0 items-center justify-center rounded-full p-1 text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" aria-hidden />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden />
                    )}
                  </button>

                  <div
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                    onClick={() => toggleExpand(dir.path)}
                  >
                    <Code2
                      className="size-4 shrink-0 text-alpha"
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium text-text-primary">
                      {dir.meta?.name || dir.name}
                    </span>
                    {dir.meta?.tags?.length ? (
                      <div className="flex gap-1">
                        {dir.meta.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-alpha/10 px-2 py-0.5 text-[10px] font-medium text-alpha"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <span className="shrink-0 text-xs font-light tabular-nums text-text-secondary">
                    {formatDateTime(dir.last_modified)}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Delete ${dir.name}`}
                      disabled={busyAction !== null}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/12 text-text-secondary transition hover:border-risk/40 hover:text-risk disabled:opacity-40"
                      onClick={() => void onDeleteDir(dir.path)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-foreground/6 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {pyFiles.map((file) => (
                        <div
                          key={file.path}
                          className="group flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-foreground/5"
                        >
                          <FileCode2
                            className="size-4 shrink-0 text-text-secondary"
                            aria-hidden
                          />
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left text-sm font-light text-text-primary hover:text-alpha"
                            onClick={() => onOpenFile(file.path)}
                          >
                            <span className="font-mono-code text-[12px]">
                              {file.name}
                            </span>
                          </button>
                          <span className="shrink-0 text-xs font-light tabular-nums text-text-secondary">
                            {formatDateTime(file.last_modified)}
                          </span>
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label={`Copy import for ${file.name}`}
                              title="Copy import snippet"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:text-alpha"
                              onClick={() => void onCopyImport(file.path)}
                            >
                              <ClipboardCopy
                                className="size-3.5"
                                aria-hidden
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${file.name}`}
                              disabled={busyAction !== null}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:text-risk disabled:opacity-40"
                              onClick={() => void onDeleteFile(file.path)}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </button>
                          </div>
                          {copiedPath === file.path ? (
                            <span className="text-xs font-medium text-alpha">
                              Copied!
                            </span>
                          ) : null}
                        </div>
                      ))}

                      {otherFiles.map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-light text-text-secondary"
                        >
                          <FileCode2 className="size-4 shrink-0" aria-hidden />
                          <span className="font-mono-code text-[12px]">
                            {file.name}
                          </span>
                        </div>
                      ))}

                      {newFileDir === dir.path ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <input
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="new_module.py"
                            className="min-w-[140px] flex-1 rounded-full border border-foreground/12 bg-background/80 px-3 py-1.5 text-sm font-light text-text-primary outline-none ring-alpha/30 focus:ring-2"
                            aria-label="New file name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                void onAddFile(dir.path);
                              if (e.key === "Escape") {
                                setNewFileDir(null);
                                setNewFileName("");
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => void onAddFile(dir.path)}
                            disabled={busyAction !== null || !newFileName.trim()}
                            className="rounded-full bg-alpha px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewFileDir(null);
                              setNewFileName("");
                            }}
                            className="rounded-full border border-foreground/12 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setNewFileDir(dir.path)}
                          disabled={busyAction !== null}
                          className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-foreground/5 hover:text-text-primary disabled:opacity-40"
                        >
                          <Plus className="size-3.5" aria-hidden />
                          Add file
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs font-light text-text-secondary">
        Open a{" "}
        <code className="font-mono-code text-[12px]">.py</code> file to edit it,
        or use the clipboard button to copy an import snippet for your notebooks.{" "}
        <Link
          href="/notebooks"
          className="font-medium text-alpha underline-offset-2 hover:underline"
        >
          Go to notebooks
        </Link>
        .
      </p>
    </div>
  );
}
