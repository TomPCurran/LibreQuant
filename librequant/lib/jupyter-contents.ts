import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";
import {
  assertPathOnLibraryTree,
  assertPathUnderRoot,
  joinJupyterPath,
  normalizeJupyterPath,
  parentPath,
  toNotebookFilename,
} from "@/lib/jupyter-paths";

export type NotebookListItem = {
  name: string;
  path: string;
  created: string;
  last_modified: string;
};

/**
 * Create each segment of `dirPath` as a directory under the Jupyter root (mkdir -p style).
 */
export async function ensureDirectory(
  contents: Contents.IManager,
  libraryRoot: string,
  dirPath: string,
): Promise<void> {
  assertPathOnLibraryTree(libraryRoot, dirPath);
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
        await contents.save(acc, { type: "directory" });
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
  await contents.delete(path);
}
