import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";

import {
  assertPathUnderRoot,
  joinJupyterPath,
  normalizeJupyterPath,
  parentPath,
  toNotebookFilename,
  toSafeDirectoryName,
} from "@/lib/jupyter-paths";

import { ensureDirectory } from "./ensure-directory";
import { uniqueBasenameInSet, uniqueName } from "./names";
import {
  assertPathUnderDataUploads,
  dataUploadsRootPath,
  parseRelativeUploadsDir,
} from "./types";

export async function createDataLibraryFolder(
  contents: Contents.IManager,
  libraryRoot: string,
  parentRelativeDir: string,
  folderName: string,
): Promise<string> {
  const safe = toSafeDirectoryName(folderName);
  const parentRel = parseRelativeUploadsDir(parentRelativeDir);
  const uploadsRoot = dataUploadsRootPath(libraryRoot);
  const parentPathResolved = parentRel ? `${uploadsRoot}/${parentRel}` : uploadsRoot;
  assertPathUnderDataUploads(libraryRoot, parentPathResolved);
  await ensureDirectory(contents, libraryRoot, parentPathResolved);
  const dir = await contents.get(parentPathResolved, { content: true });
  const existing = new Set(
    ((dir.content ?? []) as Contents.IModel[]).map((m) => m.name),
  );
  const finalName = uniqueBasenameInSet(safe, existing);
  const newPath = joinJupyterPath(parentPathResolved, finalName);
  assertPathUnderDataUploads(libraryRoot, newPath);
  await contents.save(newPath, { type: "directory" });
  return newPath;
}

/**
 * Create a notebook folder (subdirectory) under the library root.
 */
export async function createNotebookFolder(
  contents: Contents.IManager,
  libraryRoot: string,
  rawName: string,
): Promise<string> {
  const safeName = toSafeDirectoryName(rawName);
  const dirPath = joinJupyterPath(libraryRoot, safeName);
  assertPathUnderRoot(libraryRoot, dirPath);
  await ensureDirectory(contents, libraryRoot, dirPath);
  return dirPath;
}

export async function saveNotebookJson(
  contents: Contents.IManager,
  libraryRoot: string,
  path: string,
  json: INotebookContent,
): Promise<void> {
  assertPathUnderRoot(libraryRoot, path);
  await contents.save(path, {
    type: "notebook",
    format: "json",
    content: json,
  });
}

export async function createUntitledNotebook(
  contents: Contents.IManager,
  libraryRoot: string,
  initial: INotebookContent,
): Promise<string> {
  await ensureDirectory(contents, libraryRoot, libraryRoot);
  const created = await contents.newUntitled({
    path: libraryRoot,
    type: "notebook",
  });
  const p = created.path;
  assertPathUnderRoot(libraryRoot, p);
  await saveNotebookJson(contents, libraryRoot, p, initial);
  return p;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Upload a binary file (e.g. CSV, XLSX) under the notebook library root.
 *
 * @param relativePath - Path relative to `libraryRoot`, e.g. `data/uploads/foo.csv`
 */
export async function uploadBinaryFile(
  contents: Contents.IManager,
  libraryRoot: string,
  relativePath: string,
  bytes: Uint8Array,
): Promise<string> {
  const normalized = normalizeJupyterPath(relativePath);
  if (normalized.includes("..")) {
    throw new Error("Invalid path.");
  }
  const segments = normalized.split("/").filter(Boolean);
  const path = [normalizeJupyterPath(libraryRoot), ...segments].join("/");
  assertPathUnderRoot(libraryRoot, path);
  const par = parentPath(path);
  if (par) {
    await ensureDirectory(contents, libraryRoot, par);
  }
  await contents.save(path, {
    type: "file",
    format: "base64",
    content: bytesToBase64(bytes),
  });
  return path;
}

export async function uploadNotebookFile(
  contents: Contents.IManager,
  libraryRoot: string,
  desiredName: string,
  json: INotebookContent,
): Promise<string> {
  await ensureDirectory(contents, libraryRoot, libraryRoot);
  const dir = await contents.get(libraryRoot, { content: true });
  const list = (dir.content ?? []) as Contents.IModel[];
  const names = new Set(list.map((m) => m.name));
  const filename = uniqueName(toNotebookFilename(desiredName), names);
  const path = joinJupyterPath(libraryRoot, filename);
  assertPathUnderRoot(libraryRoot, path);
  await contents.save(path, {
    type: "notebook",
    format: "json",
    content: json,
  });
  return path;
}

/**
 * Recursively delete a path (file or directory) via the Jupyter Contents API.
 * Walks children depth-first so the server never sees a "not empty" directory.
 */
export async function deleteRecursive(
  contents: Contents.IManager,
  libraryRoot: string,
  path: string,
): Promise<void> {
  assertPathUnderRoot(libraryRoot, path);

  try {
    const model = await contents.get(path, { type: "directory", content: true });
    if (model.type === "directory") {
      const children = (model.content ?? []) as Contents.IModel[];
      for (const child of children) {
        await deleteRecursive(contents, libraryRoot, child.path);
      }
    }
  } catch {
    /* If listing fails (e.g. it's a file, not a directory), just delete directly */
  }

  await contents.delete(path);
}

export async function deleteNotebookPath(
  contents: Contents.IManager,
  libraryRoot: string,
  path: string,
): Promise<void> {
  assertPathUnderRoot(libraryRoot, path);
  await deleteRecursive(contents, libraryRoot, path);
}

export async function deleteDataLibraryEntry(
  contents: Contents.IManager,
  libraryRoot: string,
  path: string,
): Promise<void> {
  assertPathUnderDataUploads(libraryRoot, path);
  const uploadsRoot = dataUploadsRootPath(libraryRoot);
  if (normalizeJupyterPath(path) === normalizeJupyterPath(uploadsRoot)) {
    throw new Error("Cannot delete the uploads root.");
  }
  await deleteRecursive(contents, libraryRoot, path);
}
