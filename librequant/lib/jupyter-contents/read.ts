import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";

import { pMap } from "@/lib/concurrent";
import { getDataUploadsRelativePrefix } from "@/lib/data-sources/constants";
import {
  assertPathUnderRoot,
  normalizeJupyterPath,
} from "@/lib/jupyter-paths";
import type { NotebookFolderItem, NotebookListItem } from "@/lib/types/notebook";

import { ensureDirectory } from "./ensure-directory";
import {
  assertPathUnderDataUploads,
  dataUploadsRootPath,
  parseRelativeUploadsDir,
  type DataLibraryEntry,
  type DataUploadFileItem,
  type UploadsFolderOption,
} from "./types";

/** Directories that are not notebook folders (managed by other features). */
const EXCLUDED_DIRS = new Set(["strategies"]);

export async function listNotebooksInLibrary(
  contents: Contents.IManager,
  libraryRoot: string,
): Promise<NotebookListItem[]> {
  assertPathUnderRoot(libraryRoot, libraryRoot);
  await ensureDirectory(contents, libraryRoot, libraryRoot);
  const dir = await contents.get(libraryRoot, { content: true });
  const list = (dir.content ?? []) as Contents.IModel[];
  const items: NotebookListItem[] = [];
  for (const m of list) {
    if (m.type !== "notebook") continue;
    if (!m.path?.toLowerCase().endsWith(".ipynb")) continue;
    assertPathUnderRoot(libraryRoot, m.path);
    items.push({
      name: m.name,
      path: m.path,
      created: m.created ?? "",
      last_modified: m.last_modified ?? "",
    });
  }
  items.sort((a, b) => {
    const ta = Date.parse(a.last_modified) || 0;
    const tb = Date.parse(b.last_modified) || 0;
    return tb - ta;
  });
  return items;
}

/**
 * List `.csv` / `.xlsx` files under `{libraryRoot}/data/uploads/`.
 */
export async function listDataUploadFiles(
  contents: Contents.IManager,
  libraryRoot: string,
): Promise<DataUploadFileItem[]> {
  assertPathUnderRoot(libraryRoot, libraryRoot);
  const rel = getDataUploadsRelativePrefix();
  const uploadsDir = `${normalizeJupyterPath(libraryRoot)}/${rel}`;
  assertPathUnderRoot(libraryRoot, uploadsDir);
  await ensureDirectory(contents, libraryRoot, uploadsDir);
  const dir = await contents.get(uploadsDir, { content: true });
  const list = (dir.content ?? []) as Contents.IModel[];
  const items: DataUploadFileItem[] = [];
  for (const m of list) {
    if (m.type !== "file" || !m.path) continue;
    const lower = m.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) continue;
    assertPathUnderRoot(libraryRoot, m.path);
    items.push({
      name: m.name,
      path: m.path,
      last_modified: m.last_modified ?? "",
    });
  }
  items.sort((a, b) => {
    const ta = Date.parse(a.last_modified) || 0;
    const tb = Date.parse(b.last_modified) || 0;
    return tb - ta;
  });
  return items;
}

export async function listDataLibraryDirectory(
  contents: Contents.IManager,
  libraryRoot: string,
  relativeDir: string,
): Promise<DataLibraryEntry[]> {
  assertPathUnderRoot(libraryRoot, libraryRoot);
  const rel = parseRelativeUploadsDir(relativeDir);
  const uploadsRoot = dataUploadsRootPath(libraryRoot);
  const dirPath = rel ? `${uploadsRoot}/${rel}` : uploadsRoot;
  assertPathUnderDataUploads(libraryRoot, dirPath);
  await ensureDirectory(contents, libraryRoot, dirPath);
  const dir = await contents.get(dirPath, { content: true });
  const list = (dir.content ?? []) as Contents.IModel[];
  const items: DataLibraryEntry[] = [];
  for (const m of list) {
    if (!m.path) continue;
    if (m.type !== "file" && m.type !== "directory") continue;
    assertPathUnderDataUploads(libraryRoot, m.path);
    items.push({
      name: m.name,
      path: m.path,
      type: m.type === "directory" ? "directory" : "file",
      last_modified: m.last_modified ?? "",
    });
  }
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return items;
}

/** Lists every subdirectory under `data/uploads/` (depth-first) for move-to picker. */
export async function listDataUploadsSubfolders(
  contents: Contents.IManager,
  libraryRoot: string,
): Promise<UploadsFolderOption[]> {
  const uploadsRoot = dataUploadsRootPath(libraryRoot);
  await ensureDirectory(contents, libraryRoot, uploadsRoot);
  const out: UploadsFolderOption[] = [
    { relative: "", label: "data/uploads" },
  ];
  async function walk(dirPath: string, relFromUploads: string): Promise<void> {
    const dir = await contents.get(dirPath, { content: true });
    for (const m of (dir.content ?? []) as Contents.IModel[]) {
      if (m.type !== "directory" || !m.path) continue;
      assertPathUnderDataUploads(libraryRoot, m.path);
      const subRel = relFromUploads ? `${relFromUploads}/${m.name}` : m.name;
      out.push({
        relative: subRel,
        label: `data/uploads/${subRel}`,
      });
      await walk(m.path, subRel);
    }
  }
  await walk(uploadsRoot, "");
  return out;
}

/**
 * Lists `.csv` / `.xlsx` under `data/uploads/` recursively (newest first).
 */
export async function listDataUploadFilesRecursive(
  contents: Contents.IManager,
  libraryRoot: string,
): Promise<DataUploadFileItem[]> {
  const uploadsRoot = dataUploadsRootPath(libraryRoot);
  await ensureDirectory(contents, libraryRoot, uploadsRoot);
  const out: DataUploadFileItem[] = [];
  async function walk(dirPath: string): Promise<void> {
    const dir = await contents.get(dirPath, { content: true });
    for (const m of (dir.content ?? []) as Contents.IModel[]) {
      if (!m.path) continue;
      assertPathUnderDataUploads(libraryRoot, m.path);
      if (m.type === "directory") {
        await walk(m.path);
      } else if (m.type === "file") {
        const lower = m.name.toLowerCase();
        if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) continue;
        out.push({
          name: m.name,
          path: m.path,
          last_modified: m.last_modified ?? "",
        });
      }
    }
  }
  await walk(uploadsRoot);
  out.sort((a, b) => {
    const ta = Date.parse(a.last_modified) || 0;
    const tb = Date.parse(b.last_modified) || 0;
    return tb - ta;
  });
  return out;
}

/**
 * List notebook folders under the library root, plus loose `.ipynb` files at the root.
 * Returns a virtual "(root)" folder for top-level notebooks and a real folder for each subdirectory.
 * Excludes directories managed by other features (e.g. `strategies/`).
 */
export async function listNotebookFolders(
  contents: Contents.IManager,
  libraryRoot: string,
): Promise<NotebookFolderItem[]> {
  assertPathUnderRoot(libraryRoot, libraryRoot);
  await ensureDirectory(contents, libraryRoot, libraryRoot);
  const dir = await contents.get(libraryRoot, { content: true });
  const entries = (dir.content ?? []) as Contents.IModel[];

  const rootNotebooks: NotebookListItem[] = [];
  const folderEntries: Contents.IModel[] = [];

  for (const m of entries) {
    if (m.type === "notebook" && m.path?.toLowerCase().endsWith(".ipynb")) {
      assertPathUnderRoot(libraryRoot, m.path);
      rootNotebooks.push({
        name: m.name,
        path: m.path,
        created: m.created ?? "",
        last_modified: m.last_modified ?? "",
      });
    } else if (m.type === "directory" && !EXCLUDED_DIRS.has(m.name)) {
      assertPathUnderRoot(libraryRoot, m.path);
      folderEntries.push(m);
    }
  }

  const folders = await pMap(
    folderEntries,
    async (m): Promise<NotebookFolderItem> => {
      const subDir = await contents.get(m.path, { content: true });
      const subEntries = (subDir.content ?? []) as Contents.IModel[];
      const notebooks: NotebookListItem[] = [];
      for (const s of subEntries) {
        if (s.type === "notebook" && s.path?.toLowerCase().endsWith(".ipynb")) {
          assertPathUnderRoot(libraryRoot, s.path);
          notebooks.push({
            name: s.name,
            path: s.path,
            created: s.created ?? "",
            last_modified: s.last_modified ?? "",
          });
        }
      }
      notebooks.sort((a, b) => {
        const ta = Date.parse(a.last_modified) || 0;
        const tb = Date.parse(b.last_modified) || 0;
        return tb - ta;
      });
      return { name: m.name, path: m.path, notebooks };
    },
    6,
  );

  rootNotebooks.sort((a, b) => {
    const ta = Date.parse(a.last_modified) || 0;
    const tb = Date.parse(b.last_modified) || 0;
    return tb - ta;
  });

  const result: NotebookFolderItem[] = [];
  if (rootNotebooks.length > 0) {
    result.push({ name: "", path: libraryRoot, notebooks: rootNotebooks });
  }
  result.push(...folders);
  return result;
}

export async function getNotebookJson(
  contents: Contents.IManager,
  libraryRoot: string,
  path: string,
): Promise<INotebookContent> {
  assertPathUnderRoot(libraryRoot, path);
  const model = await contents.get(path, {
    type: "notebook",
    format: "json",
    content: true,
  });
  const c = model.content as INotebookContent;
  if (!c || typeof c !== "object" || !Array.isArray((c as INotebookContent).cells)) {
    throw new Error("Invalid notebook file.");
  }
  return c;
}
