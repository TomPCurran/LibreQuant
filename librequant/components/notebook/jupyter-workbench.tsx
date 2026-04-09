"use client";

import "@/lib/ensure-webpack-public-path";
import {
  JupyterReactTheme,
  Notebook,
  useJupyterReactStore,
} from "@datalayer/jupyter-react";
import { CellSidebarExtension } from "@datalayer/jupyter-react/notebook";
import "@datalayer/jupyter-react/style";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useRef } from "react";
import { getPublicJupyterConfig } from "@/lib/env";
import {
  ensureJupyterDevNoiseInstalledBeforeNotebook,
  teardownJupyterDevNoiseFromWorkbench,
} from "@/lib/jupyter-dev-noise";
import { initialNotebook } from "@/lib/initial-notebook";
import { loadJupyterLabPackageStylesOnce } from "@/lib/jupyter-lab-styles";
import { LIBRE_NOTEBOOK_ID } from "@/lib/notebook-constants";
import { useNotebookLocalPersistence } from "@/lib/use-notebook-local-persistence";
import { useCodemirrorAutoCloseBrackets } from "@/lib/use-codemirror-auto-close-brackets";
import { PackageSearchModal } from "@/components/package-search/package-search-modal";
import { JupyterConnectingPanel } from "./jupyter-connecting-panel";
import { useLibreJupyterSession } from "./jupyter-provider";
import { JupyterThemeLink } from "./jupyter-theme-link";
import "@/styles/jupyter-bridge.css";
import { LibreCellSidebar } from "./libre-cell-sidebar";
import { LibreNotebookToolbar } from "./libre-notebook-toolbar";
import { OutputSanitizer } from "./output-sanitizer";

const NOTEBOOK_CELL_EXTENSIONS = [
  new CellSidebarExtension({
    factory: LibreCellSidebar,
    sidebarWidth: 48,
  }),
];

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
      <div className="lq-workbench-notebook-root w-full min-h-[min(72vh,840px)]">
        <JupyterConnectingPanel baseUrl={baseUrl} />
      </div>
    );
  }

  // Before <Notebook> subtree (module singleton; avoids ref access during render).
  ensureJupyterDevNoiseInstalledBeforeNotebook();

  return (
    <div className="lq-workbench-notebook-root w-full min-h-[min(72vh,840px)]">
      {/* Primer BaseStyles defaults to var(--bgColor-default); that paints a second canvas over .lq-workbench-notebook-root */}
      <JupyterReactTheme loadJupyterLabCss={false} backgroundColor="transparent">
        <JupyterThemeLink />
        <PackageSearchModal notebookId={LIBRE_NOTEBOOK_ID} />
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
              cellSidebarMargin={52}
              extensions={NOTEBOOK_CELL_EXTENSIONS}
              Toolbar={LibreNotebookToolbar}
            />
          </div>
        </OutputSanitizer>
      </JupyterReactTheme>
    </div>
  );
}
