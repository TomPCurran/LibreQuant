/**
 * Webpack runtime global used by JupyterLab / jupyter-react for chunk/asset URLs.
 * Turbopack does not define it; set before any `@datalayer/jupyter-react` imports.
 */
const g = globalThis as typeof globalThis & { __webpack_public_path__?: string };
if (g.__webpack_public_path__ === undefined) {
  g.__webpack_public_path__ = "/";
}

export {};
