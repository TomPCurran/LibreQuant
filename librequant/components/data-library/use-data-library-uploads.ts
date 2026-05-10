"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";

import {
  DATA_SOURCES_CHANGED_EVENT,
} from "@/lib/data-sources/constants";
import { clientError } from "@/lib/client-log";
import {
  uploadBinaryFile,
  type DataLibraryEntry,
} from "@/lib/jupyter-contents";
import type { ServiceManager } from "@jupyterlab/services";

import { runDataLibraryDirectoryPickerUpload } from "./data-library-upload-directory";
import {
  DND_LIBRARY,
  nextAvailableName,
  type DndPayload,
} from "./data-library-helpers";

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
}

export type UseDataLibraryUploadsParams = {
  serviceManager: ServiceManager.IManager | null;
  blocked: boolean;
  libraryRoot: string;
  uploadsPrefix: string;
  cache: Map<string, DataLibraryEntry[]>;
  loadDirectory: (rel: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  setExpanded: Dispatch<SetStateAction<Set<string>>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string | null>>;
  performMove: (
    sourcePath: string,
    sourceIsDir: boolean,
    targetRel: string,
  ) => Promise<void>;
};

export function useDataLibraryUploads({
  serviceManager,
  blocked,
  libraryRoot,
  uploadsPrefix,
  cache,
  loadDirectory,
  refreshTree,
  setExpanded,
  setBusy,
  setStatusMsg,
  performMove,
}: UseDataLibraryUploadsParams) {
  const fileInputId = useId();
  const dirInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [dragOverRel, setDragOverRel] = useState<string | null>(null);

  const parseInternalDrag = (e: DragEvent): DndPayload | null => {
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
    e: DragEvent,
    path: string,
    isDir: boolean,
  ) => {
    const payload = JSON.stringify({ path, isDir } satisfies DndPayload);
    e.dataTransfer.setData(DND_LIBRARY, payload);
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropTarget = async (e: DragEvent, targetRel: string) => {
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
    (e: DragEvent, targetRel: string) => {
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

  const onDragLeaveZone = useCallback((e: DragEvent) => {
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
    if (!serviceManager || blocked) return;
    await runDataLibraryDirectoryPickerUpload(fileList, {
      serviceManager,
      blocked,
      libraryRoot,
      uploadsPrefix,
      cache,
      loadDirectory,
      setExpanded,
      setBusy,
      setStatusMsg,
      dirInputRef,
    });
  };

  return {
    fileInputId,
    dirInputId,
    fileInputRef,
    dirInputRef,
    dragOverRel,
    onRowDragStart,
    onDropTarget,
    onDragOverDropZone,
    onDragLeaveZone,
    onPickFiles,
    onPickDirectory,
  };
}
