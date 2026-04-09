/**
 * Mirrors @datalayer/jupyter-react JupyterLabCss package imports (without the broken
 * variables.css?raw path under Turbopack). Run once in the browser.
 */
export function loadJupyterLabPackageStylesOnce(): void {
  if (typeof window === "undefined") return;
  const g = globalThis as typeof globalThis & { __lqJupyterLabStyles?: boolean };
  if (g.__lqJupyterLabStyles) return;
  g.__lqJupyterLabStyles = true;

  void Promise.all([
    import("@jupyterlab/apputils/style/index.js"),
    import("@jupyterlab/rendermime/style/index.js"),
    import("@jupyterlab/codeeditor/style/index.js"),
    import("@jupyterlab/cells/style/index.js"),
    import("@jupyterlab/documentsearch/style/index.js"),
    import("@jupyterlab/outputarea/style/index.js"),
    import("@jupyterlab/console/style/index.js"),
    import("@jupyterlab/completer/style/index.js"),
    import("@jupyterlab/codemirror/style/index.js"),
    import("@jupyterlab/notebook/style/index.js"),
    import("@jupyterlab/filebrowser/style/index.js"),
    import("@jupyterlab/terminal/style/index.js"),
    import("@jupyterlab/ui-components/style/index.js"),
    import("@jupyter-widgets/base/css/index.css"),
    import("@jupyter-widgets/controls/css/widgets-base.css"),
  ]);
}
