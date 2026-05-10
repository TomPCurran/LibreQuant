import type { Dispatch, RefObject, SetStateAction } from "react";

import {
  DATA_SOURCES_CHANGED_EVENT,
} from "@/lib/data-sources/constants";
import { clientError } from "@/lib/client-log";
import {
  uploadBinaryFile,
  type DataLibraryEntry,
} from "@/lib/jupyter-contents";
import { pMap } from "@/lib/concurrent";
import {
  sanitizeDataFileBasename,
  toSafeDirectoryName,
} from "@/lib/jupyter-paths";
import type { ServiceManager } from "@jupyterlab/services";

import {
  isAllowedDirectoryUploadFile,
  splitRelativePath,
  uniqueBasenameInSetLocal,
} from "./data-library-helpers";

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
}

export type RunDirectoryPickerUploadCtx = {
  serviceManager: ServiceManager.IManager;
  blocked: boolean;
  libraryRoot: string;
  uploadsPrefix: string;
  cache: Map<string, DataLibraryEntry[]>;
  loadDirectory: (rel: string) => Promise<void>;
  setExpanded: Dispatch<SetStateAction<Set<string>>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string | null>>;
  dirInputRef: RefObject<HTMLInputElement | null>;
};

export async function runDataLibraryDirectoryPickerUpload(
  fileList: FileList | null,
  ctx: RunDirectoryPickerUploadCtx,
): Promise<void> {
  if (!fileList?.length) return;

  const {
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
  } = ctx;

  if (!fileList?.length || blocked) return;

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
}
