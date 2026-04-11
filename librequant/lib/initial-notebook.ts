import type { INotebookContent } from "@jupyterlab/nbformat";

/** Default notebook JSON when no localStorage snapshot exists. */
export const initialNotebook: INotebookContent = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    kernelspec: {
      display_name: "Python 3",
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
      source: [
        'print("LibreQuant")\n',
        "import matplotlib\n",
        "matplotlib.use('module://matplotlib_inline.backend_inline')\n",
        "import matplotlib.pyplot as plt\n",
        "plt.plot([1, 2, 3], [2, 3, 1])\n",
        "plt.title('Sample')\n",
        "plt.show()\n",
      ],
    },
  ],
};
