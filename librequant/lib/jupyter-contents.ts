import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";
import {
  assertPathOnLibraryTree,
  assertPathUnderRoot,
  joinJupyterPath,
  normalizeJupyterPath,
  parentPath,
  toNotebookFilename,
  toSafeDirectoryName,
} from "@/lib/jupyter-paths";
import { pMap } from "@/lib/concurrent";

/**
 * Jupyter Contents API helpers for the **notebook** library: ensure directories, create notebooks,
 * list/rename/delete, and recursive delete with bounded concurrency.
 *
 * @module jupyter-contents
 */

export type { NotebookListItem, NotebookFolderItem } from "@/lib/types/notebook";
import type { NotebookListItem, NotebookFolderItem } from "@/lib/types/notebook";

const ensureDirInflight = new Map<string, Promise<void>>();

/**
 * Create each segment of `dirPath` as a directory under the Jupyter root (mkdir -p style).
 * Deduplicates concurrent calls for the same path and tolerates "already exists" races.
 */
export async function ensureDirectory(
  contents: Contents.IManager,
  libraryRoot: string,
  dirPath: string,
): Promise<void> {
  assertPathOnLibraryTree(libraryRoot, dirPath);
  const key = normalizeJupyterPath(dirPath);
  const existing = ensureDirInflight.get(key);
  if (existing) return existing;

  const work = ensureDirectoryImpl(contents, libraryRoot, dirPath).finally(() => {
    ensureDirInflight.delete(key);
  });
  ensureDirInflight.set(key, work);
  return work;
}

async function ensureDirectoryImpl(
  contents: Contents.IManager,
  libraryRoot: string,
  dirPath: string,
): Promise<void> {
  const parts = normalizeJupyterPath(dirPath).split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    assertPathOnLibraryTree(libraryRoot, acc);
    try {
      await contents.get(acc, { content: false });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 404) {
        try {
          await contents.save(acc, { type: "directory" });
        } catch {
          await contents.get(acc, { content: false });
        }
      } else {
        throw e;
      }
    }
  }
}

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

/* ------------------------------------------------------------------ */
/*  Folder-aware listing (for sidebar tree)                            */
/* ------------------------------------------------------------------ */

/** Directories that are not notebook folders (managed by other features). */
const EXCLUDED_DIRS = new Set(["strategies"]);


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

function uniqueName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  const stem = base.toLowerCase().endsWith(".ipynb")
    ? base.slice(0, -".ipynb".length)
    : base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-${i}.ipynb`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${stem}-${Date.now()}.ipynb`;
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

export async function deleteNotebookPath(
  contents: Contents.IManager,
  libraryRoot: string,
  path: string,
): Promise<void> {
  assertPathUnderRoot(libraryRoot, path);
  await deleteRecursive(contents, libraryRoot, path);
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
