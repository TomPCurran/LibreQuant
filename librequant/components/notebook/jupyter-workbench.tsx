"use client";

import "@/lib/ensure-webpack-public-path";
import {
  JupyterReactTheme,
  Notebook,
  useJupyterReactStore,
} from "@datalayer/jupyter-react";
import "@datalayer/jupyter-react/style";
import type { INotebookContent } from "@jupyterlab/nbformat";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useRef } from "react";
import { getPublicJupyterConfig } from "@/lib/env";
import {
  ensureJupyterDevNoiseInstalledBeforeNotebook,
  teardownJupyterDevNoiseFromWorkbench,
} from "@/lib/jupyter-dev-noise";
import { loadJupyterLabPackageStylesOnce } from "@/lib/jupyter-lab-styles";
import { LIBRE_NOTEBOOK_ID } from "@/lib/notebook-constants";
import { useNotebookLocalPersistence } from "@/lib/use-notebook-local-persistence";
import { useCodemirrorAutoCloseBrackets } from "@/lib/use-codemirror-auto-close-brackets";
import { PackageSearchBar } from "@/components/package-search/package-search-bar";
import { useLibreJupyterSession } from "./jupyter-provider";
import { JupyterThemeLink } from "./jupyter-theme-link";
import "@/styles/jupyter-bridge.css";
import { LibreNotebookToolbar } from "./libre-notebook-toolbar";
import { OutputSanitizer } from "./output-sanitizer";

const initialNotebook: INotebookContent = {
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
        'print("LibreQuant Nexus")\n',
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

export function JupyterWorkbench() {
  const { baseUrl } = getPublicJupyterConfig();
  const jupyter = useLibreJupyterSession();
  const { resolvedTheme } = useTheme();
  const setJupyterColormode = useJupyterReactStore((s) => s.setColormode);

  const hostRef = useRef<HTMLDivElement>(null);

  const notebookReady =
    !jupyter.kernelIsLoading && !!jupyter.serviceManager && !!jupyter.kernel;
  const { nbformat, notebookMountKey } = useNotebookLocalPersistence(
    LIBRE_NOTEBOOK_ID,
    notebookReady,
    initialNotebook,
  );
  useCodemirrorAutoCloseBrackets(hostRef, notebookReady);

  // Do not pass `colormode` into JupyterReactTheme: it syncs to the Zustand store during render
  // and triggers "Cannot update JupyterWorkbench while rendering JupyterReactTheme".
  const themeColormode = resolvedTheme === "dark" ? "dark" : "light";
  useLayoutEffect(() => {
    setJupyterColormode(themeColormode);
  }, [setJupyterColormode, themeColormode]);

  useEffect(() => {
    loadJupyterLabPackageStylesOnce();
  }, []);

  useEffect(() => {
    if (jupyter.kernelIsLoading || !jupyter.serviceManager || !jupyter.kernel) {
      teardownJupyterDevNoiseFromWorkbench();
      return;
    }
    return () => {
      teardownJupyterDevNoiseFromWorkbench();
    };
  }, [jupyter.kernelIsLoading, jupyter.serviceManager, jupyter.kernel]);

  if (jupyter.kernelIsLoading || !jupyter.serviceManager || !jupyter.kernel) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-foreground/10 bg-background/50 px-4 text-center text-sm text-text-secondary">
        Connecting to Jupyter at {baseUrl}… Ensure Docker Jupyter is running and
        tokens match <code className="font-mono-code text-xs">.env.local</code>.
      </div>
    );
  }

  // Before <Notebook> subtree (module singleton; avoids ref access during render).
  ensureJupyterDevNoiseInstalledBeforeNotebook();

  return (
    <JupyterReactTheme loadJupyterLabCss={false}>
      <JupyterThemeLink />
      <PackageSearchBar notebookId={LIBRE_NOTEBOOK_ID} />
      <OutputSanitizer containerRef={hostRef}>
        <div ref={hostRef} className="libre-notebook-host w-full">
          <Notebook
            key={notebookMountKey}
            id={LIBRE_NOTEBOOK_ID}
            serviceManager={jupyter.serviceManager}
            kernel={jupyter.kernel}
            startDefaultKernel={false}
            nbformat={nbformat}
            height="min(72vh, 840px)"
            maxHeight="min(72vh, 840px)"
            Toolbar={LibreNotebookToolbar}
          />
        </div>
      </OutputSanitizer>
    </JupyterReactTheme>
  );
}
