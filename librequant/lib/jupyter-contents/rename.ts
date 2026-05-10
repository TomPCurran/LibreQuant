import type { Contents } from "@jupyterlab/services";

import {
  assertPathUnderRoot,
  basenameFromPath,
  joinJupyterPath,
  normalizeJupyterPath,
  parentPath,
  sanitizeDataFileBasename,
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

export async function renameDataLibraryEntry(
  contents: Contents.IManager,
  libraryRoot: string,
  oldPath: string,
  newBasename: string,
): Promise<string> {
  assertPathUnderDataUploads(libraryRoot, oldPath);
  const parent = parentPath(oldPath);
  if (!parent) throw new Error("Cannot rename this path.");
  const model = await contents.get(oldPath, { content: false });
  const newName =
    model.type === "directory"
      ? toSafeDirectoryName(newBasename)
      : sanitizeDataFileBasename(newBasename);
  const newPath = joinJupyterPath(parent, newName);
  assertPathUnderDataUploads(libraryRoot, newPath);
  if (normalizeJupyterPath(newPath) === normalizeJupyterPath(oldPath)) {
    return oldPath;
  }
  const result = await contents.rename(oldPath, newPath);
  return result.path;
}

export async function moveDataLibraryEntry(
  contents: Contents.IManager,
  libraryRoot: string,
  sourcePath: string,
  targetDirRelative: string,
): Promise<string> {
  assertPathUnderDataUploads(libraryRoot, sourcePath);
  const targetRel = parseRelativeUploadsDir(targetDirRelative);
  const uploadsRoot = dataUploadsRootPath(libraryRoot);
  const targetDir = targetRel ? `${uploadsRoot}/${targetRel}` : uploadsRoot;
  assertPathUnderDataUploads(libraryRoot, targetDir);
  const sourceParent = parentPath(sourcePath);
  if (
    normalizeJupyterPath(sourceParent ?? "") === normalizeJupyterPath(targetDir)
  ) {
    return sourcePath;
  }
  const srcModel = await contents.get(sourcePath, { content: false });
  const sourceNorm = normalizeJupyterPath(sourcePath);
  const targetNorm = normalizeJupyterPath(targetDir);
  if (
    srcModel.type === "directory" &&
    (targetNorm === sourceNorm || targetNorm.startsWith(`${sourceNorm}/`))
  ) {
    throw new Error("Cannot move a folder into itself or a subfolder.");
  }
  const baseName = basenameFromPath(sourcePath);
  if (!baseName) throw new Error("Invalid path.");
  await ensureDirectory(contents, libraryRoot, targetDir);
  const dir = await contents.get(targetDir, { content: true });
  const existing = new Set(
    ((dir.content ?? []) as Contents.IModel[]).map((m) => m.name),
  );
  const finalName = uniqueBasenameInSet(baseName, existing);
  const newPath = joinJupyterPath(targetDir, finalName);
  assertPathUnderDataUploads(libraryRoot, newPath);
  if (sourceNorm === normalizeJupyterPath(newPath)) return sourcePath;
  const result = await contents.rename(sourcePath, newPath);
  return result.path;
}

export async function renameNotebookPath(
  contents: Contents.IManager,
  libraryRoot: string,
  oldPath: string,
  newTitle: string,
): Promise<string> {
  assertPathUnderRoot(libraryRoot, oldPath);
  const filename = toNotebookFilename(newTitle);
  const dir = parentPath(oldPath);
  if (normalizeJupyterPath(dir) !== normalizeJupyterPath(libraryRoot)) {
    throw new Error("Renaming across folders is not supported.");
  }
  const newPath = joinJupyterPath(libraryRoot, filename);
  assertPathUnderRoot(libraryRoot, newPath);
  if (normalizeJupyterPath(newPath) === normalizeJupyterPath(oldPath)) {
    return oldPath;
  }
  const model = await contents.rename(oldPath, newPath);
  return model.path;
}

/**
 * Move a notebook file into a different directory by renaming its path.
 * Auto-renames on collision (e.g. `Notebook-2.ipynb`) to prevent data loss.
 * Returns the new full path.
 */
export async function moveNotebookToFolder(
  contents: Contents.IManager,
  libraryRoot: string,
  oldPath: string,
  targetFolder: string,
): Promise<string> {
  assertPathUnderRoot(libraryRoot, oldPath);
  assertPathUnderRoot(libraryRoot, targetFolder);
  const originalName = oldPath.split("/").pop() ?? "";
  if (!originalName) throw new Error("Invalid notebook path.");

  const dir = await contents.get(targetFolder, { content: true });
  const existing = new Set(
    ((dir.content ?? []) as Contents.IModel[]).map((m) => m.name),
  );
  const filename = uniqueName(originalName, existing);

  const newPath = joinJupyterPath(normalizeJupyterPath(targetFolder), filename);
  assertPathUnderRoot(libraryRoot, newPath);
  if (normalizeJupyterPath(newPath) === normalizeJupyterPath(oldPath)) {
    return oldPath;
  }
  const model = await contents.rename(oldPath, newPath);
  return model.path;
}
