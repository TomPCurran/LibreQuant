import type { Contents } from "@jupyterlab/services";

import {
  assertPathOnLibraryTree,
  normalizeJupyterPath,
} from "@/lib/jupyter-paths";

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
