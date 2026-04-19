"use client";

import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Folder,
  FolderPlus,
  FolderUp,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps, RefObject } from "react";
import {
  DATA_SOURCES_CHANGED_EVENT,
  getDataUploadsRelativePrefix,
} from "@/lib/data-sources/constants";
import { getNotebookLibraryRoot } from "@/lib/env";
import {
  createDataLibraryFolder,
  deleteDataLibraryEntry,
  listDataLibraryDirectory,
  listDataUploadsSubfolders,
  moveDataLibraryEntry,
  relativePathWithinDataUploads,
  renameDataLibraryEntry,
  uploadBinaryFile,
  type DataLibraryEntry,
  type UploadsFolderOption,
} from "@/lib/jupyter-contents";
import { pMap } from "@/lib/concurrent";
import { useJupyterReachability } from "@/lib/jupyter-reachability-context";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import {
  sanitizeDataFileBasename,
  toSafeDirectoryName,
} from "@/lib/jupyter-paths";
import { useHasMounted } from "@/lib/use-has-mounted";

const DND_LIBRARY =
  "application/x-librequant-data-library";

/** Non-empty `<option value>` for uploads root — avoids controlled-select bugs with `value=""`. */
const UPLOADS_ROOT_SELECT_VALUE = "__data_uploads_root__";

function splitRelativePath(raw: string): string[] {
  return raw.replace(/\\/g, "/").split("/").filter(Boolean);
}

/** Mirrors `uniqueBasenameInSet` in jupyter-contents for top-level folder names. */
function uniqueBasenameInSetLocal(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  const lastDot = base.lastIndexOf(".");
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base;
  const ext = lastDot > 0 ? base.slice(lastDot) : "";
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

function isAllowedDirectoryUploadFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".csv") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".tsv") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".pdf")
  );
}

type DndPayload = { path: string; isDir: boolean };

function parentRelative(rel: string): string {
  const parts = rel.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function childRelative(parentRel: string, name: string): string {
  return parentRel ? `${parentRel}/${name}` : name;
}

function nextAvailableName(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) return desired;
  const lastDot = desired.lastIndexOf(".");
  const stem = lastDot > 0 ? desired.slice(0, lastDot) : desired;
  const ext = lastDot > 0 ? desired.slice(lastDot) : "";
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

function canDropInto(
  libraryRoot: string,
  sourceFullPath: string,
  sourceIsDir: boolean,
  targetRel: string,
): boolean {
  let sourceRel: string;
  try {
    sourceRel = relativePathWithinDataUploads(libraryRoot, sourceFullPath);
  } catch {
    return false;
  }
  const sourceParent = parentRelative(sourceRel);
  if (sourceParent === targetRel) return false;
  if (sourceIsDir) {
    if (targetRel === sourceRel || targetRel.startsWith(`${sourceRel}/`)) {
      return false;
    }
  }
  return true;
}

type DataLibraryTreeProps = {
  parentRel: string;
  depth: number;
  cache: Map<string, DataLibraryEntry[]>;
  expanded: Set<string>;
  loadingRels: Set<string>;
  busy: boolean;
  dragOverRel: string | null;
  onToggleExpand: (rel: string) => void;
  onDragOverDropZone: (e: React.DragEvent, targetRel: string) => void;
  onDragLeaveZone: (e: React.DragEvent) => void;
  onDropOnTarget: (e: React.DragEvent, targetRel: string) => void;
  onRowDragStart: (e: React.DragEvent, path: string, isDir: boolean) => void;
  onRenameClick: (entry: DataLibraryEntry, isDir: boolean) => void;
  onMoveClick: (entry: DataLibraryEntry, isDir: boolean) => void;
  onDeleteClick: (entry: DataLibraryEntry, isDir: boolean) => void;
  inlineNewFolderAt: string | null;
  inlineNewFolderName: string;
  newFolderInputRef: RefObject<HTMLInputElement | null>;
  onOpenInlineNewFolder: (parentRel: string) => void;
  onInlineNewFolderNameChange: (value: string) => void;
  onCancelInlineNewFolder: () => void;
  onSubmitInlineNewFolder: () => void;
};

function DataLibraryTree({
  parentRel,
  depth,
  cache,
  expanded,
  loadingRels,
  busy,
  dragOverRel,
  onToggleExpand,
  onDragOverDropZone,
  onDragLeaveZone,
  onDropOnTarget,
  onRowDragStart,
  onRenameClick,
  onMoveClick,
  onDeleteClick,
  inlineNewFolderAt,
  inlineNewFolderName,
  newFolderInputRef,
  onOpenInlineNewFolder,
  onInlineNewFolderNameChange,
  onCancelInlineNewFolder,
  onSubmitInlineNewFolder,
}: DataLibraryTreeProps) {
  const items = cache.get(parentRel);
  if (items === undefined) return null;
  const pad = 12 + depth * 16;
  const composerOpen = inlineNewFolderAt === parentRel;

  return (
    <div role="group">
      {items.map((entry) => {
        const rel = childRelative(parentRel, entry.name);
        const isDir = entry.type === "directory";
        const isExpanded = expanded.has(rel);
        const loading = loadingRels.has(rel);
        const isRootListRow = parentRel === "";
        const rootFileDropTarget = !isDir && isRootListRow;
        const rowDropHighlight =
          (isDir && dragOverRel === rel) ||
          (rootFileDropTarget && dragOverRel === "");

        return (
          <div key={entry.path}>
            <div
              draggable={!busy}
              onDragStart={(e) => onRowDragStart(e, entry.path, isDir)}
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5.5rem] items-center gap-2 border-b border-foreground/5 text-sm last:border-0 ${
                rowDropHighlight
                  ? "bg-alpha/10 ring-1 ring-inset ring-alpha/35"
                  : ""
              }`}
              style={{ paddingLeft: pad }}
              onDragOver={
                isDir
                  ? (e) => onDragOverDropZone(e, rel)
                  : rootFileDropTarget
                    ? (e) => onDragOverDropZone(e, "")
                    : undefined
              }
              onDragLeave={
                isDir || rootFileDropTarget ? onDragLeaveZone : undefined
              }
              onDrop={
                isDir
                  ? (e) => void onDropOnTarget(e, rel)
                  : rootFileDropTarget
                    ? (e) => void onDropOnTarget(e, "")
                    : undefined
              }
            >
              <div className="flex min-w-0 items-center gap-1 py-2">
                {isDir ? (
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-foreground/10 hover:text-alpha"
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded ? "Collapse folder" : "Expand folder"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(rel);
                    }}
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : isExpanded ? (
                      <ChevronDown className="size-4" aria-hidden />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden />
                    )}
                  </button>
                ) : (
                  <span className="inline-block w-7 shrink-0" aria-hidden />
                )}
                {isDir ? (
                  <Folder
                    className="size-4 shrink-0 text-alpha/80"
                    aria-hidden
                  />
                ) : (
                  <FileSpreadsheet
                    className="size-4 shrink-0 text-alpha/80"
                    aria-hidden
                  />
                )}
                <span
                  className={`truncate font-mono-code text-[13px] ${
                    isDir ? "font-medium text-alpha" : "text-text-primary"
                  }`}
                >
                  {entry.name}
                </span>
              </div>
              <div className="hidden text-xs text-text-secondary sm:block">
                {entry.last_modified
                  ? new Date(entry.last_modified).toLocaleString()
                  : "—"}
              </div>
              <div className="flex justify-end gap-0.5 py-1">
                <button
                  type="button"
                  disabled={busy}
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameClick(entry, isDir);
                  }}
                  className="rounded-lg p-1.5 text-text-secondary transition hover:bg-foreground/10 hover:text-alpha disabled:opacity-50"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  title="Move to folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveClick(entry, isDir);
                  }}
                  className="rounded-lg p-1.5 text-text-secondary transition hover:bg-foreground/10 hover:text-alpha disabled:opacity-50"
                >
                  <Folder className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(entry, isDir);
                  }}
                  className="rounded-lg p-1.5 text-text-secondary transition hover:bg-foreground/10 hover:text-risk disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
            {isDir && isExpanded ? (
              <DataLibraryTree
                parentRel={rel}
                depth={depth + 1}
                cache={cache}
                expanded={expanded}
                loadingRels={loadingRels}
                busy={busy}
                dragOverRel={dragOverRel}
                onToggleExpand={onToggleExpand}
                onDragOverDropZone={onDragOverDropZone}
                onDragLeaveZone={onDragLeaveZone}
                onDropOnTarget={onDropOnTarget}
                onRowDragStart={onRowDragStart}
                onRenameClick={onRenameClick}
                onMoveClick={onMoveClick}
                onDeleteClick={onDeleteClick}
                inlineNewFolderAt={inlineNewFolderAt}
                inlineNewFolderName={inlineNewFolderName}
                newFolderInputRef={newFolderInputRef}
                onOpenInlineNewFolder={onOpenInlineNewFolder}
                onInlineNewFolderNameChange={onInlineNewFolderNameChange}
                onCancelInlineNewFolder={onCancelInlineNewFolder}
                onSubmitInlineNewFolder={onSubmitInlineNewFolder}
              />
            ) : null}
          </div>
        );
      })}
      <div
        className={`grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5.5rem] items-center gap-2 border-b border-foreground/5 text-sm ${
          composerOpen ? "bg-alpha/4" : ""
        }`}
        style={{ paddingLeft: pad }}
      >
        {composerOpen ? (
          <>
            <div className="flex min-w-0 items-center gap-1 py-2">
              <span className="inline-block w-7 shrink-0" aria-hidden />
              <FolderPlus
                className="size-4 shrink-0 text-alpha/60"
                aria-hidden
              />
              <input
                ref={newFolderInputRef}
                type="text"
                value={inlineNewFolderName}
                onChange={(e) => onInlineNewFolderNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmitInlineNewFolder();
                  }
                  if (e.key === "Escape") onCancelInlineNewFolder();
                }}
                placeholder="Folder name"
                disabled={busy}
                aria-label="New folder name"
                className="min-w-0 flex-1 rounded-lg border border-foreground/15 bg-background px-2.5 py-1.5 font-mono-code text-[13px] text-text-primary outline-none ring-alpha/30 placeholder:text-text-secondary/50 focus-visible:ring-2 disabled:opacity-50"
              />
            </div>
            <div className="hidden text-xs text-text-secondary sm:block">—</div>
            <div className="flex justify-end gap-1 py-1">
              <button
                type="button"
                disabled={busy}
                className="rounded-lg px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-foreground/10 hover:text-text-primary disabled:opacity-50"
                onClick={onCancelInlineNewFolder}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !inlineNewFolderName.trim()}
                className="rounded-lg bg-alpha/90 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-alpha disabled:opacity-50"
                onClick={() => onSubmitInlineNewFolder()}
              >
                Create
              </button>
            </div>
          </>
        ) : (
          <div className="col-span-3 flex min-w-0 py-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpenInlineNewFolder(parentRel)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pr-2 text-left text-[13px] text-text-secondary transition hover:bg-foreground/5 hover:text-alpha disabled:opacity-50"
            >
              <span className="inline-block w-7 shrink-0" aria-hidden />
              <FolderPlus
                className="size-4 shrink-0 text-alpha/50"
                aria-hidden
              />
              <span>Add new folder</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DataLibraryManager() {
  const { reachable } = useJupyterReachability();
  const { serviceManager, error: smError } = useJupyterServiceManager();
  const hasMounted = useHasMounted();
  const blocked =
    !hasMounted || !reachable || !serviceManager || Boolean(smError);
  const libraryRoot = getNotebookLibraryRoot();
  const uploadsPrefix = getDataUploadsRelativePrefix();
  const fileInputId = useId();
  const dirInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const [cache, setCache] = useState<Map<string, DataLibraryEntry[]>>(
    () => new Map(),
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [loadingRels, setLoadingRels] = useState<Set<string>>(
    () => new Set(),
  );
  const [rootLoading, setRootLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [dragOverRel, setDragOverRel] = useState<string | null>(null);

  const [renameState, setRenameState] = useState<{
    path: string;
    name: string;
    isDir: boolean;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [moveState, setMoveState] = useState<{
    path: string;
    name: string;
    isDir: boolean;
  } | null>(null);
  const [moveTargetRel, setMoveTargetRel] = useState("");
  const [folderOptions, setFolderOptions] = useState<UploadsFolderOption[]>(
    [],
  );

  const [deleteState, setDeleteState] = useState<{
    path: string;
    name: string;
    isDir: boolean;
  } | null>(null);

  /** `null` = composer closed; `""` = creating at uploads root; else parent rel. */
  const [inlineNewFolderAt, setInlineNewFolderAt] = useState<string | null>(
    null,
  );
  const [inlineNewFolderName, setInlineNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const notifyChanged = () => {
    window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
  };

  const loadDirectory = useCallback(
    async (rel: string) => {
      if (!serviceManager || blocked) return;
      setLoadingRels((r) => new Set(r).add(rel));
      try {
        const list = await listDataLibraryDirectory(
          serviceManager.contents,
          libraryRoot,
          rel,
        );
        setCache((c) => new Map(c).set(rel, list));
      } catch (e) {
        console.error(e);
        setStatusMsg("Could not load folder contents.");
      } finally {
        setLoadingRels((r) => {
          const n = new Set(r);
          n.delete(rel);
          return n;
        });
      }
    },
    [serviceManager, blocked, libraryRoot],
  );

  const refreshTree = useCallback(async () => {
    if (!serviceManager || blocked) return;
    setListError(null);
    setRootLoading(true);
    try {
      const rels = new Set<string>(["", ...expanded]);
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
      setCache(new Map(pairs));
      notifyChanged();
    } catch (e) {
      console.error(e);
      setListError("Could not refresh library.");
    } finally {
      setRootLoading(false);
    }
  }, [serviceManager, blocked, libraryRoot, expanded]);

  useEffect(() => {
    if (!serviceManager || blocked) return;
    let cancelled = false;
    (async () => {
      setRootLoading(true);
      setListError(null);
      try {
        const list = await listDataLibraryDirectory(
          serviceManager.contents,
          libraryRoot,
          "",
        );
        if (!cancelled) {
          setCache(new Map([["", list]]));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setListError("Could not load library.");
      } finally {
        if (!cancelled) setRootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceManager, blocked, libraryRoot]);

  const toggleExpand = useCallback(
    (rel: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(rel)) {
          next.delete(rel);
        } else {
          next.add(rel);
          void loadDirectory(rel);
        }
        return next;
      });
    },
    [loadDirectory],
  );

  const loadFolderOptions = useCallback(async () => {
    if (!serviceManager) return;
    try {
      const opts = await listDataUploadsSubfolders(
        serviceManager.contents,
        libraryRoot,
      );
      setFolderOptions(opts);
    } catch {
      setFolderOptions([{ relative: "", label: "data/uploads" }]);
    }
  }, [serviceManager, libraryRoot]);

  useEffect(() => {
    if (moveState) void loadFolderOptions();
  }, [moveState, loadFolderOptions]);

  useEffect(() => {
    if (inlineNewFolderAt !== null) {
      queueMicrotask(() => newFolderInputRef.current?.focus());
    }
  }, [inlineNewFolderAt]);

  const moveFolderOptions = useMemo(() => {
    if (!moveState || !serviceManager) return folderOptions;
    try {
      const sourceRel = relativePathWithinDataUploads(
        libraryRoot,
        moveState.path,
      );
      if (moveState.isDir) {
        return folderOptions.filter(
          (o) =>
            o.relative !== sourceRel &&
            !o.relative.startsWith(`${sourceRel}/`),
        );
      }
      const sourceParent = parentRelative(sourceRel);
      return folderOptions.filter(
        (o) => sourceParent === "" || o.relative !== sourceParent,
      );
    } catch {
      return folderOptions;
    }
  }, [folderOptions, moveState, libraryRoot, serviceManager]);

  const performMove = useCallback(
    async (sourcePath: string, sourceIsDir: boolean, targetRel: string) => {
      if (!serviceManager) return;
      if (
        !canDropInto(libraryRoot, sourcePath, sourceIsDir, targetRel)
      ) {
        setStatusMsg("Cannot move there.");
        return;
      }
      setBusy(true);
      setStatusMsg(null);
      try {
        await moveDataLibraryEntry(
          serviceManager.contents,
          libraryRoot,
          sourcePath,
          targetRel,
        );
        setStatusMsg("Moved.");
        notifyChanged();
        await refreshTree();
      } catch (e) {
        console.error(e);
        setStatusMsg(e instanceof Error ? e.message : "Move failed.");
      } finally {
        setBusy(false);
      }
    },
    [serviceManager, libraryRoot, refreshTree],
  );

  const parseInternalDrag = (e: React.DragEvent): DndPayload | null => {
    const raw =
      e.dataTransfer.getData(DND_LIBRARY) ||
      e.dataTransfer.getData("text/plain");
    if (!raw || !raw.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(raw) as DndPayload;
      if (
        typeof parsed.path === "string" &&
        typeof parsed.isDir === "boolean"
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const onRowDragStart = (
    e: React.DragEvent,
    path: string,
    isDir: boolean,
  ) => {
    const payload = JSON.stringify({ path, isDir } satisfies DndPayload);
    e.dataTransfer.setData(DND_LIBRARY, payload);
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropTarget = async (
    e: React.DragEvent,
    targetRel: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverRel(null);

    const internalPayload = parseInternalDrag(e);
    if (internalPayload) {
      await performMove(
        internalPayload.path,
        internalPayload.isDir,
        targetRel,
      );
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (!serviceManager || blocked) return;
      const names = new Set(
        (cache.get(targetRel) ?? []).map((x) => x.name),
      );
      setBusy(true);
      setStatusMsg(null);
      try {
        let n = 0;
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i];
          if (!file) continue;
          const lower = file.name.toLowerCase();
          if (
            !lower.endsWith(".csv") &&
            !lower.endsWith(".xlsx") &&
            !lower.endsWith(".xls")
          ) {
            setStatusMsg("Only .csv, .xlsx, .xls can be uploaded.");
            continue;
          }
          const finalName = nextAvailableName(file.name, names);
          names.add(finalName);
          const rel = targetRel
            ? `${uploadsPrefix}/${targetRel}/${finalName}`
            : `${uploadsPrefix}/${finalName}`;
          const buf = new Uint8Array(await file.arrayBuffer());
          await uploadBinaryFile(
            serviceManager.contents,
            libraryRoot,
            rel,
            buf,
          );
          n += 1;
        }
        if (n > 0) {
          setStatusMsg(`Uploaded ${n} file(s).`);
          notifyChanged();
          if (targetRel) {
            setExpanded((prev) => new Set(prev).add(targetRel));
          }
          await refreshTree();
        }
      } catch (err) {
        console.error(err);
        setStatusMsg("Upload failed.");
      } finally {
        setBusy(false);
      }
      return;
    }
  };

  const onDragOverDropZone = useCallback(
    (e: React.DragEvent, targetRel: string) => {
      const types = Array.from(e.dataTransfer.types);
      const hasFiles = types.some((t) => t === "Files");
      const hasInternal =
        types.includes(DND_LIBRARY) ||
        (!hasFiles && types.includes("text/plain"));
      if (!hasFiles && !hasInternal) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = hasFiles ? "copy" : "move";
      setDragOverRel(targetRel);
      e.stopPropagation();
    },
    [],
  );

  const onDragLeaveZone = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverRel(null);
    }
  }, []);

  const onPickFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || !serviceManager || blocked) return;
    let names = new Set((cache.get("") ?? []).map((e) => e.name));
    if (names.size === 0 && !cache.has("")) {
      await loadDirectory("");
      names = new Set((cache.get("") ?? []).map((e) => e.name));
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      let n = 0;
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!file) continue;
        const lower = file.name.toLowerCase();
        if (
          !lower.endsWith(".csv") &&
          !lower.endsWith(".xlsx") &&
          !lower.endsWith(".xls")
        ) {
          setStatusMsg("Skipped non-CSV/Excel files. Allowed: .csv, .xlsx, .xls.");
          continue;
        }
        const finalName = nextAvailableName(file.name, names);
        names.add(finalName);
        const rel = `${uploadsPrefix}/${finalName}`;
        const buf = new Uint8Array(await file.arrayBuffer());
        await uploadBinaryFile(serviceManager.contents, libraryRoot, rel, buf);
        n += 1;
      }
      if (n > 0) {
        setStatusMsg(`Uploaded ${n} file(s).`);
        notifyChanged();
        await refreshTree();
      }
    } catch (e) {
      console.error(e);
      setStatusMsg("Upload failed. Is Jupyter running?");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onPickDirectory = async (fileList: FileList | null) => {
    if (!fileList?.length || !serviceManager || blocked) return;
    const files = Array.from(fileList);
    const first = files[0];
    const wr0 = (
      first as File & { webkitRelativePath?: string }
    ).webkitRelativePath;
    if (!wr0) {
      setStatusMsg("Folder upload is not supported in this browser.");
      if (dirInputRef.current) dirInputRef.current.value = "";
      return;
    }
    const topParts = splitRelativePath(wr0);
    if (topParts.length < 2) {
      setStatusMsg(
        "Choose a folder that contains at least one file inside it.",
      );
      if (dirInputRef.current) dirInputRef.current.value = "";
      return;
    }
    const rootRaw = topParts[0];
    let safeRoot: string;
    try {
      safeRoot = toSafeDirectoryName(rootRaw);
    } catch (e) {
      setStatusMsg(
        e instanceof Error ? e.message : "Invalid folder name.",
      );
      if (dirInputRef.current) dirInputRef.current.value = "";
      return;
    }
    let names = new Set((cache.get("") ?? []).map((e) => e.name));
    if (names.size === 0 && !cache.has("")) {
      await loadDirectory("");
      names = new Set((cache.get("") ?? []).map((e) => e.name));
    }
    const finalRoot = uniqueBasenameInSetLocal(safeRoot, names);

    type UploadRow = { rel: string; file: File };
    const items: UploadRow[] = [];
    let skippedOther = 0;
    let skippedSanitize = 0;

    for (const file of files) {
      const wr = (file as File & { webkitRelativePath?: string })
        .webkitRelativePath;
      if (!wr) continue;
      const segs = splitRelativePath(wr);
      if (segs.length < 2 || segs[0] !== rootRaw) continue;
      const inner = segs.slice(1);
      const baseName = inner[inner.length - 1];
      if (!baseName || !isAllowedDirectoryUploadFile(baseName)) {
        skippedOther += 1;
        continue;
      }
      try {
        const dirParts = inner.slice(0, -1).map((s) => toSafeDirectoryName(s));
        const safeFile = sanitizeDataFileBasename(baseName);
        const safeInner = [...dirParts, safeFile].join("/");
        const rel = `${uploadsPrefix}/${finalRoot}/${safeInner}`;
        items.push({ rel, file });
      } catch {
        skippedSanitize += 1;
      }
    }

    if (items.length === 0) {
      const parts = [];
      if (skippedOther > 0) {
        parts.push(
          `Skipped ${skippedOther} file(s) (allowed: .csv, .xlsx, .tsv, .txt, .pdf).`,
        );
      }
      if (skippedSanitize > 0) {
        parts.push(`Skipped ${skippedSanitize} path(s) with invalid names.`);
      }
      setStatusMsg(
        parts.length > 0
          ? `No files uploaded. ${parts.join(" ")}`
          : "No matching files in that folder.",
      );
      if (dirInputRef.current) dirInputRef.current.value = "";
      return;
    }

    setBusy(true);
    setStatusMsg(null);
    try {
      await pMap(
        items,
        async ({ rel, file }) => {
          const buf = new Uint8Array(await file.arrayBuffer());
          await uploadBinaryFile(serviceManager.contents, libraryRoot, rel, buf);
        },
        4,
      );
      const tail: string[] = [];
      if (skippedOther > 0) {
        tail.push(`Skipped ${skippedOther} non-allowed file(s).`);
      }
      if (skippedSanitize > 0) {
        tail.push(`Skipped ${skippedSanitize} path(s) with invalid names.`);
      }
      setStatusMsg(
        `Uploaded folder "${finalRoot}" (${items.length} file(s)).${
          tail.length ? ` ${tail.join(" ")}` : ""
        }`,
      );
      notifyChanged();
      await loadDirectory("");
      await loadDirectory(finalRoot);
      setExpanded((prev) => new Set(prev).add(finalRoot));
    } catch (e) {
      console.error(e);
      setStatusMsg("Folder upload failed.");
    } finally {
      setBusy(false);
      if (dirInputRef.current) dirInputRef.current.value = "";
    }
  };

  const submitInlineNewFolder = useCallback(async () => {
    if (
      !serviceManager ||
      blocked ||
      !inlineNewFolderName.trim() ||
      inlineNewFolderAt === null
    ) {
      return;
    }
    const parentRel = inlineNewFolderAt;
    setBusy(true);
    setStatusMsg(null);
    try {
      await createDataLibraryFolder(
        serviceManager.contents,
        libraryRoot,
        parentRel,
        inlineNewFolderName.trim(),
      );
      setInlineNewFolderAt(null);
      setInlineNewFolderName("");
      setStatusMsg("Folder created.");
      notifyChanged();
      if (parentRel) {
        setExpanded((prev) => new Set(prev).add(parentRel));
      }
      await loadDirectory(parentRel || "");
    } catch (e) {
      console.error(e);
      setStatusMsg(
        e instanceof Error ? e.message : "Could not create folder.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    serviceManager,
    blocked,
    inlineNewFolderName,
    inlineNewFolderAt,
    libraryRoot,
    loadDirectory,
  ]);

  const openInlineNewFolder = useCallback((parentRel: string) => {
    setInlineNewFolderAt(parentRel);
    setInlineNewFolderName("");
  }, []);

  const cancelInlineNewFolder = useCallback(() => {
    setInlineNewFolderAt(null);
    setInlineNewFolderName("");
  }, []);

  const onConfirmRename = async () => {
    if (!serviceManager || !renameState || !renameValue.trim()) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      await renameDataLibraryEntry(
        serviceManager.contents,
        libraryRoot,
        renameState.path,
        renameValue.trim(),
      );
      setRenameState(null);
      setRenameValue("");
      setStatusMsg("Renamed.");
      notifyChanged();
      await refreshTree();
    } catch (e) {
      console.error(e);
      setStatusMsg(e instanceof Error ? e.message : "Rename failed.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmMove = async () => {
    if (!serviceManager || !moveState) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      await moveDataLibraryEntry(
        serviceManager.contents,
        libraryRoot,
        moveState.path,
        moveTargetRel,
      );
      setMoveState(null);
      setStatusMsg("Moved.");
      notifyChanged();
      await refreshTree();
    } catch (e) {
      console.error(e);
      setStatusMsg(e instanceof Error ? e.message : "Move failed.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!serviceManager || !deleteState) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      await deleteDataLibraryEntry(
        serviceManager.contents,
        libraryRoot,
        deleteState.path,
      );
      setDeleteState(null);
      setStatusMsg("Deleted.");
      notifyChanged();
      await refreshTree();
    } catch (e) {
      console.error(e);
      setStatusMsg(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const rootEntries = cache.get("") ?? [];

  const handleRenameClick = useCallback(
    (entry: DataLibraryEntry, isDir: boolean) => {
      setRenameState({
        path: entry.path,
        name: entry.name,
        isDir,
      });
      setRenameValue(entry.name);
    },
    [],
  );

  const handleMoveClick = useCallback((entry: DataLibraryEntry, isDir: boolean) => {
    setMoveTargetRel("");
    setMoveState({
      path: entry.path,
      name: entry.name,
      isDir,
    });
  }, []);

  const handleDeleteClick = useCallback(
    (entry: DataLibraryEntry, isDir: boolean) => {
      setDeleteState({
        path: entry.path,
        name: entry.name,
        isDir,
      });
    },
    [],
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="max-w-xl text-sm font-light text-text-secondary">
              Drag files or folders onto a folder to move them. Expand folders in
              place to browse. Files can be dropped from your computer onto a
              folder or the library root.{" "}
              <strong className="font-medium text-text-primary">Upload folder</strong>{" "}
              adds the chosen directory at the top level of{" "}
              <code className="font-mono-code text-[12px]">{uploadsPrefix}/</code>{" "}
              (only{" "}
              <code className="font-mono-code text-[12px]">.csv</code>,{" "}
              <code className="font-mono-code text-[12px]">.xlsx</code>,{" "}
              <code className="font-mono-code text-[12px]">.tsv</code>,{" "}
              <code className="font-mono-code text-[12px]">.txt</code>,{" "}
              <code className="font-mono-code text-[12px]">.pdf</code>). Use{" "}
              <code className="font-mono-code text-[12px]">
                read_tabular(&quot;yourfile.csv&quot;)
              </code>{" "}
              with paths relative to <code className="font-mono-code text-[12px]">uploads</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              multiple
              accept=".csv,.xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="sr-only"
              disabled={Boolean(busy || blocked)}
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <input
              ref={dirInputRef}
              id={dirInputId}
              type="file"
              multiple
              className="sr-only"
              disabled={Boolean(busy || blocked)}
              onChange={(e) => void onPickDirectory(e.target.files)}
              {...({
                webkitdirectory: "",
                directory: "",
                mozdirectory: "",
              } as ComponentProps<"input">)}
            />
            <button
              type="button"
              disabled={Boolean(busy || blocked)}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-alpha/35 bg-alpha/10 px-4 text-sm font-medium text-alpha transition hover:bg-alpha/15 disabled:opacity-50"
            >
              <Upload className="size-4" aria-hidden />
              Upload
            </button>
            <button
              type="button"
              disabled={Boolean(busy || blocked)}
              onClick={() => dirInputRef.current?.click()}
              aria-label="Upload folder from your computer into the data library"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-alpha/35 bg-alpha/10 px-4 text-sm font-medium text-alpha transition hover:bg-alpha/15 disabled:opacity-50"
            >
              <FolderUp className="size-4" aria-hidden />
              Upload folder
            </button>
            <button
              type="button"
              disabled={Boolean(busy || blocked)}
              onClick={() => openInlineNewFolder("")}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-4 text-sm font-medium text-text-primary transition hover:border-alpha/30 hover:text-alpha disabled:opacity-50"
            >
              <FolderPlus className="size-4" aria-hidden />
              New folder
            </button>
            <button
              type="button"
              disabled={Boolean(busy || blocked || rootLoading)}
              onClick={() => void refreshTree()}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 px-3 text-sm font-medium text-text-secondary transition hover:text-alpha disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${rootLoading ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </button>
          </div>
        </div>

        {blocked ? (
          <p className="text-sm text-risk">
            Jupyter is not connected — start Docker and wait for the workbench to
            connect before managing files.
          </p>
        ) : (
          <>
            <div
              className={`flex min-h-12 flex-wrap items-center rounded-lg border border-dashed border-foreground/20 px-3 py-3 text-xs transition-colors ${
                dragOverRel === ""
                  ? "border-alpha/50 bg-alpha/10 text-text-primary"
                  : "text-text-secondary"
              }`}
              onDragOver={(e) => onDragOverDropZone(e, "")}
              onDragLeave={onDragLeaveZone}
              onDrop={(e) => void onDropTarget(e, "")}
            >
              <span className="font-mono-code text-alpha">{uploadsPrefix}</span>
              <span className="ml-2">
                — library root; or drop on a top-level file row
              </span>
            </div>

            {listError ? (
              <p className="text-sm text-risk" role="alert">
                {listError}
              </p>
            ) : rootLoading && rootEntries.length === 0 ? (
              <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
                <Loader2 className="size-4 animate-spin text-alpha" aria-hidden />
                Loading library…
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-foreground/10">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5.5rem] gap-2 border-b border-foreground/10 bg-foreground/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  <div className="pl-[52px]">Name</div>
                  <div className="hidden sm:block">Modified</div>
                  <div className="text-right">Actions</div>
                </div>
                {rootEntries.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-text-secondary">
                    This folder is empty. Upload CSV/Excel files or add a folder
                    below.
                  </p>
                ) : null}
                <DataLibraryTree
                  parentRel=""
                  depth={0}
                  cache={cache}
                  expanded={expanded}
                  loadingRels={loadingRels}
                  busy={busy}
                  dragOverRel={dragOverRel}
                  onToggleExpand={toggleExpand}
                  onDragOverDropZone={onDragOverDropZone}
                  onDragLeaveZone={onDragLeaveZone}
                  onDropOnTarget={onDropTarget}
                  onRowDragStart={onRowDragStart}
                  onRenameClick={handleRenameClick}
                  onMoveClick={handleMoveClick}
                  onDeleteClick={handleDeleteClick}
                  inlineNewFolderAt={inlineNewFolderAt}
                  inlineNewFolderName={inlineNewFolderName}
                  newFolderInputRef={newFolderInputRef}
                  onOpenInlineNewFolder={openInlineNewFolder}
                  onInlineNewFolderNameChange={setInlineNewFolderName}
                  onCancelInlineNewFolder={cancelInlineNewFolder}
                  onSubmitInlineNewFolder={() => void submitInlineNewFolder()}
                />
              </div>
            )}

            {statusMsg ? (
              <p className="mt-3 text-sm text-text-secondary" role="status">
                {statusMsg}
              </p>
            ) : null}
          </>
        )}
      </div>

      {renameState ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setRenameState(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl"
            role="dialog"
            aria-labelledby="rename-dialog-title"
          >
            <h3
              id="rename-dialog-title"
              className="text-sm font-semibold text-text-primary"
            >
              Rename {renameState.isDir ? "folder" : "file"}
            </h3>
            <label className="mt-3 block text-sm text-text-secondary">
              New name
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-sm text-text-primary outline-none ring-alpha/30 focus-visible:ring-2"
                autoFocus
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                onClick={() => setRenameState(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !renameValue.trim()}
                className="rounded-full bg-alpha px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => void onConfirmRename()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {moveState ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setMoveState(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl"
            role="dialog"
            aria-labelledby="move-dialog-title"
          >
            <h3
              id="move-dialog-title"
              className="text-sm font-semibold text-text-primary"
            >
              Move &quot;{moveState.name}&quot;
            </h3>
            <label className="mt-3 block text-sm text-text-secondary">
              Destination folder
              <select
                value={
                  moveTargetRel === ""
                    ? UPLOADS_ROOT_SELECT_VALUE
                    : moveTargetRel
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setMoveTargetRel(
                    v === UPLOADS_ROOT_SELECT_VALUE ? "" : v,
                  );
                }}
                className="mt-1 w-full rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 font-mono-code text-xs text-text-primary outline-none ring-alpha/30 focus-visible:ring-2"
              >
                {moveFolderOptions.map((o) => (
                  <option
                    key={o.relative || "root"}
                    value={
                      o.relative === ""
                        ? UPLOADS_ROOT_SELECT_VALUE
                        : o.relative
                    }
                  >
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                onClick={() => setMoveState(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-full bg-alpha px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => void onConfirmMove()}
              >
                Move here
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteState ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setDeleteState(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl"
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
          >
            <h3
              id="delete-dialog-title"
              className="text-sm font-semibold text-risk"
            >
              Delete {deleteState.isDir ? "folder" : "file"}?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              {deleteState.isDir
                ? "This will remove the folder and everything inside it. This cannot be undone."
                : "This file will be removed from your Jupyter workspace. This cannot be undone."}
            </p>
            <p className="mt-1 font-mono-code text-xs text-text-primary">
              {deleteState.name}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                onClick={() => setDeleteState(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-full bg-risk px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => void onConfirmDelete()}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
