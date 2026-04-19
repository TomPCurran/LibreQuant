/**
 * Normalize and validate Jupyter Contents paths against the configured library root.
 */

export function normalizeJupyterPath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((p) => p && p !== ".")
    .join("/");
}

function segments(path: string): string[] {
  return normalizeJupyterPath(path).split("/").filter(Boolean);
}

/** True if `candidate` is exactly `root` or a nested path under `root`. */
export function isPathUnderRoot(root: string, candidate: string): boolean {
  const r = segments(root);
  const c = segments(candidate);
  if (c.length < r.length) return false;
  for (let i = 0; i < r.length; i++) {
    if (r[i] !== c[i]) return false;
  }
  return true;
}

/**
 * True if `path` is the library root, a **prefix** of the root (ancestor segments
 * needed for mkdir -p), or a path under the root. Use only for directory creation.
 */
export function isPathOnLibraryTree(root: string, path: string): boolean {
  const r = normalizeJupyterPath(root);
  const p = normalizeJupyterPath(path);
  if (!p) return false;
  if (p === r) return true;
  if (r.startsWith(`${p}/`)) return true;
  return isPathUnderRoot(r, p);
}

export function assertPathUnderRoot(root: string, candidate: string): void {
  const n = normalizeJupyterPath(candidate);
  if (!n) throw new Error("Path is empty.");
  if (n.includes("..")) throw new Error("Invalid path.");
  if (!isPathUnderRoot(root, n)) {
    throw new Error("Path is outside the notebook library.");
  }
}

export function assertPathOnLibraryTree(root: string, candidate: string): void {
  const n = normalizeJupyterPath(candidate);
  if (!n) throw new Error("Path is empty.");
  if (n.includes("..")) throw new Error("Invalid path.");
  if (!isPathOnLibraryTree(root, n)) {
    throw new Error("Path is outside the notebook library.");
  }
}

export function parentPath(path: string): string {
  const s = segments(path);
  if (s.length <= 1) return "";
  return s.slice(0, -1).join("/");
}

export function joinJupyterPath(dir: string, name: string): string {
  const d = normalizeJupyterPath(dir);
  const n = normalizeJupyterPath(name);
  if (!n || n.includes("/")) throw new Error("Invalid name.");
  return d ? `${d}/${n}` : n;
}

/** Display stem without `.ipynb` (basename). */
export function notebookStemFromPath(path: string): string {
  const s = segments(path);
  const base = s[s.length - 1] ?? "";
  return base.toLowerCase().endsWith(".ipynb")
    ? base.slice(0, -".ipynb".length)
    : base;
}

const SAFE_NAME = /^[a-zA-Z0-9._\- ]+$/;
const SAFE_DIR_NAME = /^[a-zA-Z0-9_\-]+$/;

/**
 * Sanitize a user-provided notebook title to a single path segment ending in `.ipynb`.
 */
export function toNotebookFilename(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Name is required.");
  const withoutExt = trimmed.toLowerCase().endsWith(".ipynb")
    ? trimmed.slice(0, -".ipynb".length)
    : trimmed;
  const collapsed = withoutExt.replace(/\s+/g, " ").trim();
  if (!SAFE_NAME.test(collapsed)) {
    throw new Error(
      "Use only letters, numbers, spaces, dot, underscore, or hyphen.",
    );
  }
  if (collapsed === "." || collapsed === "..") throw new Error("Invalid name.");
  return `${collapsed}.ipynb`;
}

/**
 * Sanitize a user-provided filename to a single path segment ending in `.py`.
 */
export function toPythonFilename(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Name is required.");
  const withoutExt = trimmed.toLowerCase().endsWith(".py")
    ? trimmed.slice(0, -".py".length)
    : trimmed;
  const collapsed = withoutExt.replace(/\s+/g, "_").trim();
  if (!SAFE_DIR_NAME.test(collapsed)) {
    throw new Error(
      "Use only letters, numbers, underscore, or hyphen.",
    );
  }
  if (collapsed === "." || collapsed === "..") throw new Error("Invalid name.");
  return `${collapsed}.py`;
}

/**
 * Sanitize a user-provided directory name to a safe single path segment
 * (snake_case style: letters, numbers, underscore, hyphen).
 */
export function toSafeDirectoryName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Name is required.");
  const collapsed = trimmed.replace(/\s+/g, "_");
  if (!SAFE_DIR_NAME.test(collapsed)) {
    throw new Error(
      "Use only letters, numbers, underscore, or hyphen.",
    );
  }
  if (collapsed === "." || collapsed === "..") throw new Error("Invalid name.");
  return collapsed;
}

/** Display the last path segment (basename). */
export function basenameFromPath(path: string): string {
  const s = segments(path);
  return s[s.length - 1] ?? "";
}

/**
 * Validates a rename target for a data file under `data/uploads` (single path segment, no traversal).
 */
export function sanitizeDataFileBasename(raw: string): string {
  const t = raw.trim();
  if (!t || t.length > 200) throw new Error("Name is required (max 200 characters).");
  if (t.includes("/") || t.includes("\\") || t === "." || t === "..") {
    throw new Error("File name cannot contain path separators.");
  }
  if (!/^[\w\- .()]+$/.test(t)) {
    throw new Error(
      "Use only letters, numbers, spaces, and safe punctuation (._- parentheses).",
    );
  }
  return t;
}
