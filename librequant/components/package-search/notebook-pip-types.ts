/**
 * Subset of `@datalayer/jupyter-react` notebook adapter `executeCode` result used for `%pip`.
 * Defined locally so {@link PackageSearchPanel} does not import jupyter-react (avoids pulling
 * the full notebook stack + `@jupyterlab/settingregistry` / `json5` into unrelated routes).
 */
export type NotebookPipExecuteResult = {
  success: boolean;
  error?: string;
  outputs?: Array<{ type: string; content?: unknown }>;
};

/** `null` means no notebook kernel is available yet — caller may fall back to `serviceManager`. */
export type RunNotebookPipInstall = (
  code: string,
) => Promise<NotebookPipExecuteResult | null>;
