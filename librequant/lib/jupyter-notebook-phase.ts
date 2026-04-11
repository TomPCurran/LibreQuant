/**
 * User-facing phases for the notebook workbench (Jupyter server vs Python kernel vs notebook file).
 * @module jupyter-notebook-phase
 */

export type NotebookWorkbenchPhase =
  | "connecting_jupyter"
  | "starting_kernel"
  | "loading_notebook_file"
  | "load_failed"
  | "ready";

/** Stable copy for loading UIs — keep in sync across home workspace and notebook editor. */
export const NOTEBOOK_PHASE_TITLE: Record<
  Exclude<NotebookWorkbenchPhase, "ready" | "load_failed">,
  string
> = {
  connecting_jupyter: "Connecting to Jupyter server",
  starting_kernel: "Starting Python kernel",
  loading_notebook_file: "Loading notebook file",
};

export const NOTEBOOK_PHASE_DESCRIPTION: Record<
  Exclude<NotebookWorkbenchPhase, "ready" | "load_failed">,
  string
> = {
  connecting_jupyter:
    "Opening a session to your local Jupyter process (HTTP and WebSockets). The Next.js UI is ready; this step is the Jupyter connection only.",
  starting_kernel:
    "The Jupyter server is starting a Python kernel for this notebook. Code runs here, not in the browser.",
  loading_notebook_file:
    "Fetching the notebook JSON from the Jupyter Contents API (your file on disk in the container).",
};

/** Next.js `Suspense` boundary while the home route shell resolves `searchParams`. */
export const HOME_WORKSPACE_SHELL_LOADING = "Loading workspace shell…";

/** `next/dynamic` while the Jupyter notebook bundle loads in the browser (frontend-only). */
export const HOME_NOTEBOOK_BUNDLE_LOADING = "Loading Jupyter notebook UI (browser bundle)…";
