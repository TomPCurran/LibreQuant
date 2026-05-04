"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DATA_SOURCES_CHANGED_EVENT,
  getDataUploadsRelativePrefix,
} from "@/lib/data-sources/constants";
import { clientError } from "@/lib/client-log";
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

import {
  canDropInto,
  DND_LIBRARY,
  isAllowedDirectoryUploadFile,
  nextAvailableName,
  parentRelative,
  type DndPayload,
  splitRelativePath,
  uniqueBasenameInSetLocal,
} from "./data-library-helpers";
import type {
  DeleteState,
  MoveState,
  RenameState,
} from "./data-library-dialog-state";

export function useDataLibrary() {
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

  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [moveState, setMoveState] = useState<MoveState | null>(null);
  const [moveTargetRel, setMoveTargetRel] = useState("");
  const [folderOptions, setFolderOptions] = useState<UploadsFolderOption[]>(
    [],
  );

  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

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
        clientError("Could not load folder contents", e);
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
      clientError("Could not refresh library", e);
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
        clientError("Could not load library", e);
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
      if (!canDropInto(libraryRoot, sourcePath, sourceIsDir, targetRel)) {
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
        clientError("Move failed", e);
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

  const onDropTarget = async (e: React.DragEvent, targetRel: string) => {
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
      const names = new Set((cache.get(targetRel) ?? []).map((x) => x.name));
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
        clientError("Upload failed (drop)", err);
        setStatusMsg("Upload failed.");
      } finally {
        setBusy(false);
      }
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
      clientError("Upload failed (picker)", e);
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
      clientError("Folder upload failed", e);
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
      clientError("Could not create folder", e);
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
      clientError("Rename failed", e);
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
      clientError("Move failed (dialog)", e);
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
      clientError("Delete failed", e);
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

  return {
    blocked,
    uploadsPrefix,
    fileInputId,
    dirInputId,
    fileInputRef,
    dirInputRef,
    cache,
    expanded,
    loadingRels,
    rootLoading,
    listError,
    busy,
    statusMsg,
    dragOverRel,
    renameState,
    renameValue,
    setRenameValue,
    moveState,
    moveTargetRel,
    setMoveTargetRel,
    moveFolderOptions,
    deleteState,
    inlineNewFolderAt,
    inlineNewFolderName,
    setInlineNewFolderName,
    newFolderInputRef,
    rootEntries,
    refreshTree,
    toggleExpand,
    onRowDragStart,
    onDropTarget,
    onDragOverDropZone,
    onDragLeaveZone,
    onPickFiles,
    onPickDirectory,
    submitInlineNewFolder,
    openInlineNewFolder,
    cancelInlineNewFolder,
    onConfirmRename,
    onConfirmMove,
    onConfirmDelete,
    handleRenameClick,
    handleMoveClick,
    handleDeleteClick,
    setRenameState,
    setMoveState,
    setDeleteState,
  };
}
