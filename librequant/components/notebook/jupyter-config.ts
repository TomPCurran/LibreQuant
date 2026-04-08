import type { INotebookContent } from "@jupyterlab/nbformat";
import type { IJupyterProps } from "@datalayer/jupyter-react/jupyter";

/** Optional IPyWidgets: load require.js in root layout (see Datalayer Next.js docs). */

/**
 * Typed factory for `useJupyter` options: JupyterLite (`lite: true`) by default,
 * or a remote Jupyter Server when `NEXT_PUBLIC_JUPYTER_SERVER_URL` is set.
 */
export function buildUseJupyterProps(): IJupyterProps {
  const url = process.env.NEXT_PUBLIC_JUPYTER_SERVER_URL?.trim();
  const token = process.env.NEXT_PUBLIC_JUPYTER_SERVER_TOKEN ?? "";

  if (url) {
    return {
      jupyterServerUrl: url,
      jupyterServerToken: token,
      startDefaultKernel: true,
    };
  }

  return {
    lite: true,
    startDefaultKernel: true,
  };
}

/** Initial notebook document for the workbench (nbformat 4). */
export const DEFAULT_NOTEBOOK_CONTENT: INotebookContent = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    kernelspec: {
      display_name: "Python 3 (ipykernel)",
      language: "python",
      name: "python3",
    },
    language_info: {
      name: "python",
    },
  },
  cells: [
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: "# LibreQuant notebook\nimport sys\nprint(sys.version)\n",
    },
  ],
};
