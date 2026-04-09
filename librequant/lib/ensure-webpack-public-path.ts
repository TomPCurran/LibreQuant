/**
 * Webpack injects `var __webpack_public_path__` in classic bundles. JupyterLab
 * reads and assigns this global. Turbopack does not, so we create a sloppy-mode
 * global binding before any @datalayer/jupyter-react module evaluates.
 */
if (typeof globalThis !== "undefined") {
  try {
    // eslint-disable-next-line no-new-func -- non-strict body so assignment creates a global binding
    new Function(
      'if (typeof __webpack_public_path__ === "undefined") __webpack_public_path__ = "/"'
    )();
  } catch {
    const g = globalThis as typeof globalThis & { __webpack_public_path__?: string };
    g.__webpack_public_path__ ??= "/";
  }
}

export {};
