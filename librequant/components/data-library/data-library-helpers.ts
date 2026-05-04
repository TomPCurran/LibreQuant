import { relativePathWithinDataUploads } from "@/lib/jupyter-contents";

export const DND_LIBRARY = "application/x-librequant-data-library";

/** Non-empty `<option value>` for uploads root — avoids controlled-select bugs with `value=""`. */
export const UPLOADS_ROOT_SELECT_VALUE = "__data_uploads_root__";

export type DndPayload = { path: string; isDir: boolean };

export function splitRelativePath(raw: string): string[] {
  return raw.replace(/\\/g, "/").split("/").filter(Boolean);
}

/** Mirrors `uniqueBasenameInSet` in jupyter-contents for top-level folder names. */
export function uniqueBasenameInSetLocal(
  base: string,
  existing: Set<string>,
): string {
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

export function isAllowedDirectoryUploadFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".csv") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".tsv") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".pdf")
  );
}

export function parentRelative(rel: string): string {
  const parts = rel.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

export function childRelative(parentRel: string, name: string): string {
  return parentRel ? `${parentRel}/${name}` : name;
}

export function nextAvailableName(desired: string, taken: Set<string>): string {
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

export function canDropInto(
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
