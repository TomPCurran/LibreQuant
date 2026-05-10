import { getDataUploadsRelativePrefix } from "@/lib/data-sources/constants";
import {
  assertPathUnderRoot,
  normalizeJupyterPath,
} from "@/lib/jupyter-paths";

export type DataUploadFileItem = {
  name: string;
  path: string;
  last_modified: string;
};

export type DataLibraryEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
  last_modified: string;
};

export type UploadsFolderOption = { relative: string; label: string };

export function dataUploadsRootPath(libraryRoot: string): string {
  const root = normalizeJupyterPath(libraryRoot);
  const rel = getDataUploadsRelativePrefix();
  return `${root}/${rel}`;
}

export function assertPathUnderDataUploads(
  libraryRoot: string,
  candidate: string,
): void {
  assertPathUnderRoot(libraryRoot, candidate);
  const base = dataUploadsRootPath(libraryRoot);
  const c = normalizeJupyterPath(candidate);
  const b = normalizeJupyterPath(base);
  if (c !== b && !c.startsWith(`${b}/`)) {
    throw new Error("Path is outside data/uploads.");
  }
}

export function parseRelativeUploadsDir(rel: string): string {
  const n = normalizeJupyterPath(rel);
  if (n.includes("..")) throw new Error("Invalid path.");
  for (const seg of n.split("/").filter(Boolean)) {
    if (seg === "." || seg === "..") throw new Error("Invalid path.");
  }
  return n;
}

/** Path under `data/uploads/` (no leading slash), or `""` for the uploads root. */
export function relativePathWithinDataUploads(
  libraryRoot: string,
  absolutePath: string,
): string {
  const base = dataUploadsRootPath(libraryRoot);
  const a = normalizeJupyterPath(absolutePath);
  const b = normalizeJupyterPath(base);
  if (a === b) return "";
  if (!a.startsWith(`${b}/`)) {
    throw new Error("Path is not under data/uploads.");
  }
  return a.slice(b.length + 1);
}
