/**
 * Stable React `id` for `@datalayer/jupyter-react` `Notebook` keyed by server path.
 */
export function notebookReactIdFromPath(path: string): string {
  return `lq-nb-${encodeURIComponent(path)}`;
}
