import type { Contents } from "@jupyterlab/services";
import {
  assertPathOnLibraryTree,
  assertPathUnderRoot,
  basenameFromPath,
  joinJupyterPath,
  normalizeJupyterPath,
  parentPath,
  toPythonFilename,
  toSafeDirectoryName,
} from "@/lib/jupyter-paths";
import { deleteRecursive, ensureDirectory } from "@/lib/jupyter-contents";
import { pMap } from "@/lib/concurrent";
import { getStrategyLibraryRoot } from "@/lib/env";
import {
  LIBREQUANT_STRATEGY_CREATED,
  type LibreQuantStrategyCreatedDetail,
} from "@/lib/kernel-lifecycle-events";

/**
 * Jupyter Contents API operations for the **strategies** tree: packages, `strategy.py`,
 * `meta.json`, `__init__.py`, and bounded-concurrency listing.
 *
 * After creating a new strategy directory, dispatches {@link LIBREQUANT_STRATEGY_CREATED} so
 * notebook-side hooks can refresh package hygiene without a kernel restart.
 *
 * @module strategy-contents
 */

/* ------------------------------------------------------------------ */
/*  Types (re-exported from @/lib/types/strategy)                      */
/* ------------------------------------------------------------------ */

export type {
  StrategyMeta,
  StrategyFileItem,
  StrategyDirectoryItem,
} from "@/lib/types/strategy";
import type {
  StrategyMeta,
  StrategyFileItem,
  StrategyDirectoryItem,
} from "@/lib/types/strategy";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const root = () => getStrategyLibraryRoot();

/**
 * Runtime validator for `StrategyMeta` — avoids blind `as` cast on untrusted
 * JSON, returning `null` for malformed data instead of letting callers crash.
 */
function parseStrategyMeta(raw: string): StrategyMeta | null {
  try {
    const obj: unknown = JSON.parse(raw);
    if (typeof obj !== "object" || obj === null) return null;
    const rec = obj as Record<string, unknown>;
    if (typeof rec.name !== "string") return null;
    return {
      name: rec.name,
      tags: Array.isArray(rec.tags)
        ? (rec.tags as unknown[]).filter(
            (t): t is string => typeof t === "string",
          )
        : [],
      author: typeof rec.author === "string" ? rec.author : "",
      created: typeof rec.created === "string" ? rec.created : "",
      last_run: typeof rec.last_run === "string" ? rec.last_run : null,
    };
  } catch {
    return null;
  }
}

const DEFAULT_STRATEGY_PY = `"""
Strategy module — define your signal logic here.

Exported symbols are re-exported by the package __init__.py, so notebooks
can import them directly:

    from <strategy_name> import *
    from <strategy_name> import signal, PARAMS
    from <strategy_name>.strategy import signal
"""

import numpy as np
import pandas as pd


PARAMS = {
    "lookback": 20,
}


def signal(prices: pd.DataFrame) -> pd.Series:
    """Return a Series of position signals (+1 long, -1 short, 0 flat)."""
    close = prices["close"]
    ma = close.rolling(PARAMS["lookback"]).mean()
    return (close > ma).astype(int).rename("signal")
`;

function defaultMeta(name: string): StrategyMeta {
  return {
    name,
    tags: [],
    author: "",
    created: new Date().toISOString(),
    last_run: null,
  };
}

/* ------------------------------------------------------------------ */
/*  Read operations                                                    */
/* ------------------------------------------------------------------ */

export async function listStrategyDirectories(
  contents: Contents.IManager,
): Promise<StrategyDirectoryItem[]> {
  const r = root();
  assertPathUnderRoot(r, r);
  await ensureDirectory(contents, r, r);

  const dir = await contents.get(r, { content: true });
  const entries = (dir.content ?? []) as Contents.IModel[];

  const dirEntries = entries.filter(
    (entry): entry is Contents.IModel & { type: "directory" } => {
      if (entry.type !== "directory") return false;
      assertPathUnderRoot(r, entry.path);
      return true;
    },
  );

  const results = await pMap(
    dirEntries,
    async (entry): Promise<StrategyDirectoryItem> => {
      const files = await listFilesInDirectory(contents, entry.path);
      let meta: StrategyMeta | null = null;
      const metaFile = files.find((f) => f.name === "meta.json");
      if (metaFile) {
        try {
          const raw = await getTextFileContent(contents, metaFile.path);
          meta = parseStrategyMeta(raw);
        } catch {
          /* meta.json corrupt or missing — continue without it */
        }
      }

      return {
        name: entry.name,
        path: entry.path,
        last_modified: entry.last_modified ?? "",
        meta,
        files,
      };
    },
    6,
  );

  results.sort((a, b) => {
    const ta = Date.parse(a.last_modified) || 0;
    const tb = Date.parse(b.last_modified) || 0;
    return tb - ta;
  });

  return results;
}

export async function listFilesInDirectory(
  contents: Contents.IManager,
  dirPath: string,
): Promise<StrategyFileItem[]> {
  const r = root();
  assertPathUnderRoot(r, dirPath);
  const dir = await contents.get(dirPath, { content: true });
  const entries = (dir.content ?? []) as Contents.IModel[];

  const files: StrategyFileItem[] = [];
  const dirs: { model: Contents.IModel; item: StrategyFileItem }[] = [];

  for (const m of entries) {
    const item: StrategyFileItem = {
      name: m.name,
      path: m.path,
      type: m.type === "directory" ? "directory" : "file",
      last_modified: m.last_modified ?? "",
    };
    if (item.type === "directory") {
      dirs.push({ model: m, item });
    }
    files.push(item);
  }

  if (dirs.length > 0) {
    await pMap(
      dirs,
      async ({ item }) => {
        item.children = await listFilesInDirectory(contents, item.path);
      },
      6,
    );
  }

  return files;
}

export async function getTextFileContent(
  contents: Contents.IManager,
  path: string,
): Promise<string> {
  const r = root();
  assertPathUnderRoot(r, path);
  const model = await contents.get(path, {
    type: "file",
    format: "text",
    content: true,
  });
  return (model.content as string) ?? "";
}

/* ------------------------------------------------------------------ */
/*  Write operations                                                   */
/* ------------------------------------------------------------------ */

export async function saveTextFileContent(
  contents: Contents.IManager,
  path: string,
  content: string,
): Promise<void> {
  const r = root();
  assertPathUnderRoot(r, path);
  await contents.save(path, {
    type: "file",
    format: "text",
    content,
  });
}

export async function createStrategyDirectory(
  contents: Contents.IManager,
  rawName: string,
): Promise<string> {
  const r = root();
  const safeName = toSafeDirectoryName(rawName);
  const dirPath = joinJupyterPath(r, safeName);
  assertPathUnderRoot(r, dirPath);
  assertPathOnLibraryTree(r, dirPath);

  await ensureDirectory(contents, r, dirPath);

  const initPath = joinJupyterPath(dirPath, "__init__.py");
  await saveTextFileContent(contents, initPath, "from .strategy import *\n");

  const strategyPath = joinJupyterPath(dirPath, "strategy.py");
  await saveTextFileContent(contents, strategyPath, DEFAULT_STRATEGY_PY);

  const metaPath = joinJupyterPath(dirPath, "meta.json");
  const meta = defaultMeta(rawName);
  await saveTextFileContent(contents, metaPath, JSON.stringify(meta, null, 2));

  const runsPath = joinJupyterPath(dirPath, "runs");
  await ensureDirectory(contents, r, runsPath);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<LibreQuantStrategyCreatedDetail>(
        LIBREQUANT_STRATEGY_CREATED,
        { detail: { dirPath } },
      ),
    );
  }

  return dirPath;
}

export async function createStrategyFile(
  contents: Contents.IManager,
  dirPath: string,
  rawFilename: string,
): Promise<string> {
  const r = root();
  assertPathUnderRoot(r, dirPath);
  const filename = toPythonFilename(rawFilename);
  const filePath = joinJupyterPath(dirPath, filename);
  assertPathUnderRoot(r, filePath);
  await saveTextFileContent(contents, filePath, `"""${filename}"""\n`);
  return filePath;
}

export async function createStrategySubfolder(
  contents: Contents.IManager,
  parentDirPath: string,
  rawName: string,
): Promise<string> {
  const r = root();
  assertPathUnderRoot(r, parentDirPath);
  const safeName = toSafeDirectoryName(rawName);
  const folderPath = joinJupyterPath(parentDirPath, safeName);
  assertPathUnderRoot(r, folderPath);
  await ensureDirectory(contents, r, folderPath);
  const initPath = joinJupyterPath(folderPath, "__init__.py");
  await saveTextFileContent(contents, initPath, "");
  return folderPath;
}

export async function deleteStrategyFile(
  contents: Contents.IManager,
  path: string,
): Promise<void> {
  const r = root();
  assertPathUnderRoot(r, path);
  await contents.delete(path);
}

export async function deleteStrategyDirectory(
  contents: Contents.IManager,
  dirPath: string,
): Promise<void> {
  const r = root();
  assertPathUnderRoot(r, dirPath);
  await deleteRecursive(contents, r, dirPath);
}

export async function moveStrategyFile(
  contents: Contents.IManager,
  oldPath: string,
  targetDirPath: string,
): Promise<string> {
  const r = root();
  assertPathUnderRoot(r, oldPath);
  assertPathUnderRoot(r, targetDirPath);

  const name = basenameFromPath(oldPath);
  const dir = await contents.get(targetDirPath, { content: true });
  const existing = new Set(
    ((dir.content ?? []) as Contents.IModel[]).map((m) => m.name),
  );

  let filename = name;
  if (existing.has(filename)) {
    const dotIdx = filename.lastIndexOf(".");
    const stem = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    const ext = dotIdx > 0 ? filename.slice(dotIdx) : "";
    for (let i = 2; i < 1000; i++) {
      const candidate = `${stem}-${i}${ext}`;
      if (!existing.has(candidate)) {
        filename = candidate;
        break;
      }
    }
  }

  const newPath = joinJupyterPath(normalizeJupyterPath(targetDirPath), filename);
  assertPathUnderRoot(r, newPath);
  if (normalizeJupyterPath(newPath) === normalizeJupyterPath(oldPath)) {
    return oldPath;
  }
  const model = await contents.rename(oldPath, newPath);
  return model.path;
}

/**
 * Rename a file or directory to a new **basename** in the same parent folder.
 * Use this from the strategy file tree; `joinJupyterPath` rejects path segments
 * in the name, and `assertPathUnderRoot` keeps the result inside the library.
 */
export async function renameStrategyItem(
  contents: Contents.IManager,
  oldPath: string,
  newBasename: string,
): Promise<string> {
  const r = root();
  assertPathUnderRoot(r, oldPath);
  const trimmed = newBasename.trim();
  if (!trimmed) throw new Error("Name is required.");
  const dir = parentPath(oldPath);
  const newPath = joinJupyterPath(dir, trimmed);
  assertPathUnderRoot(r, newPath);
  if (normalizeJupyterPath(newPath) === normalizeJupyterPath(oldPath)) {
    return oldPath;
  }
  const model = await contents.rename(oldPath, newPath);
  return model.path;
}

/** Rename a `.py` strategy module with stem sanitization via `toPythonFilename`. */
export async function renameStrategyFile(
  contents: Contents.IManager,
  oldPath: string,
  newName: string,
): Promise<string> {
  const r = root();
  assertPathUnderRoot(r, oldPath);
  const filename = toPythonFilename(newName);
  const dir = parentPath(oldPath);
  const newPath = joinJupyterPath(dir, filename);
  assertPathUnderRoot(r, newPath);
  if (normalizeJupyterPath(newPath) === normalizeJupyterPath(oldPath)) {
    return oldPath;
  }
  const model = await contents.rename(oldPath, newPath);
  return model.path;
}

/* ------------------------------------------------------------------ */
/*  Package hygiene                                                    */
/* ------------------------------------------------------------------ */

/**
 * Ensure every strategy sub-directory has an `__init__.py` so Python treats
 * it as a package.  Runs via the Jupyter Contents API (no kernel needed),
 * and skips directories that already have one.
 */
export async function ensureInitPyInAllStrategies(
  contents: Contents.IManager,
): Promise<void> {
  const r = root();
  try {
    const dir = await contents.get(r, { content: true });
    const entries = (dir.content ?? []) as Contents.IModel[];

    const dirs = entries.filter((entry) => entry.type === "directory");
    await pMap(
      dirs,
      async (entry) => {
        const initPath = joinJupyterPath(entry.path, "__init__.py");
        try {
          await contents.get(initPath, { content: false });
        } catch {
          await saveTextFileContent(
            contents,
            initPath,
            "from .strategy import *\n",
          );
        }
      },
      6,
    );
  } catch {
    /* strategies root doesn't exist yet — nothing to do */
  }
}

/* ------------------------------------------------------------------ */
/*  Import snippet                                                     */
/* ------------------------------------------------------------------ */

/**
 * Extract the Python package name (strategy directory) from any path
 * under the strategies root.  e.g.
 *   "work/librequant/strategies/my_strat/strategy.py"  →  "my_strat"
 *   "work/librequant/strategies/my_strat"               →  "my_strat"
 */
function packageNameFromPath(filePath: string): string {
  const stratRoot = normalizeJupyterPath(getStrategyLibraryRoot());
  const norm = normalizeJupyterPath(filePath);
  const rel = norm.startsWith(stratRoot + "/")
    ? norm.slice(stratRoot.length + 1)
    : norm;
  return rel.split("/")[0];
}

/**
 * Module name (without `.py`) from a file path.
 */
function moduleNameFromFile(filePath: string): string {
  const base = basenameFromPath(filePath);
  return base.endsWith(".py") ? base.slice(0, -3) : base;
}

/**
 * Build a wildcard import of the strategy package.
 *
 * The strategies root is on `sys.path` and every strategy directory has an
 * `__init__.py` that re-exports `from .strategy import *`, so:
 *
 *   from test_strategy import *
 */
export function buildImportSnippet(filePath: string): string {
  const pkg = packageNameFromPath(filePath);
  return `from ${pkg} import *`;
}

/**
 * Build a selective import for a specific module inside the package.
 *
 *   from test_strategy.helpers import *
 *   from test_strategy import strategy
 *
 * If the file is `strategy.py` (the main module) a shorter form is used.
 */
export function buildSelectiveImportSnippet(filePath: string): string {
  const pkg = packageNameFromPath(filePath);
  const mod = moduleNameFromFile(filePath);
  if (mod === pkg || mod === "strategy") {
    return `from ${pkg} import strategy`;
  }
  return `from ${pkg}.${mod} import *`;
}
