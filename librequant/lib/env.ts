/**
 * Client-safe Jupyter connection settings (public env only).
 *
 * Empty `NEXT_PUBLIC_JUPYTER_TOKEN` must not be passed through: @datalayer/jupyter-react
 * treats `""` as an explicit token and skips its defaults, so unauthenticated requests get 403.
 */
export function getPublicJupyterConfig(): {
  baseUrl: string;
  token: string;
} {
  const raw =
    process.env.NEXT_PUBLIC_JUPYTER_BASE_URL ?? "http://localhost:8888";
  const baseUrl = raw.replace(/\/$/, "");
  const fromEnv = process.env.NEXT_PUBLIC_JUPYTER_TOKEN?.trim() ?? "";
  const token =
    fromEnv ||
    (process.env.NODE_ENV === "development" ? "devtoken" : "");
  return { baseUrl, token };
}

/**
 * Jupyter contents path for the notebook library (no leading/trailing slash segments).
 * Must stay in sync with Docker layout under `/home/jovyan/work/...` when using compose.
 */
export function getNotebookLibraryRoot(): string {
  const raw =
    process.env.NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT?.trim() ?? "work/librequant";
  return raw.replace(/^\/+/, "").replace(/\/+$/, "");
}
