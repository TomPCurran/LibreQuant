"use client";

import "@/lib/ensure-webpack-public-path";
import {
  JupyterReactTheme,
  Notebook,
  notebookStore,
  useJupyterReactStore,
} from "@datalayer/jupyter-react";
import { CellSidebarExtension } from "@datalayer/jupyter-react/notebook";
import "@datalayer/jupyter-react/style";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getPublicJupyterConfig } from "@/lib/env";
import {
  ensureJupyterDevNoiseInstalledBeforeNotebook,
  teardownJupyterDevNoiseFromWorkbench,
} from "@/lib/jupyter-dev-noise";
import { initialNotebook } from "@/lib/initial-notebook";
import { loadJupyterLabPackageStylesOnce } from "@/lib/jupyter-lab-styles";
import { createUntitledNotebook } from "@/lib/jupyter-contents";
import { getNotebookLibraryRoot } from "@/lib/env";
import {
  loadStoredNotebookContent,
} from "@/lib/notebook-local-storage";
import { notebookReactIdFromPath } from "@/lib/notebook-id";
import { useNotebookServerPersistence } from "@/lib/use-notebook-server-persistence";
import { useCodemirrorAutoCloseBrackets } from "@/lib/use-codemirror-auto-close-brackets";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import { useWorkbenchStore } from "@/lib/stores/workbench-store";
import { PackageSearchModal } from "@/components/package-search/package-search-modal";
import { JupyterConnectingPanel } from "./jupyter-connecting-panel";
import { useLibreJupyterSession } from "./jupyter-provider";
import { JupyterThemeLink } from "./jupyter-theme-link";
import "@/styles/jupyter-bridge.css";
import { LibreCellSidebar } from "./libre-cell-sidebar";
import { LibreNotebookToolbar } from "./libre-notebook-toolbar";
import { OutputSanitizer } from "./output-sanitizer";
import { NotebookWorkbenchProvider } from "./notebook-workbench-context";

function WorkspaceEmptyState() {
  const router = useRouter();
  const libraryRoot = getNotebookLibraryRoot();
  const { serviceManager } = useJupyterServiceManager();
  const legacy = loadStoredNotebookContent();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onImportLegacy = async () => {
    if (!serviceManager || !legacy) return;
    setBusy(true);
    setErr(null);
    try {
      const path = await createUntitledNotebook(
        serviceManager.contents,
        libraryRoot,
        legacy,
      );
      router.replace(`/?path=${encodeURIComponent(path)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="glass rounded-4xl p-8 text-center">
        <p className="heading-brand text-lg text-text-primary">
          Open a notebook to start
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed text-text-secondary">
          Pick a file from your library or create a new one. Notebooks are stored
          on your Jupyter server under{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            {libraryRoot}
          </code>
          .
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/notebooks"
            className="inline-flex items-center justify-center rounded-full bg-alpha px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90"
          >
            Open Notebook Library
          </Link>
          {legacy ? (
            <button
              type="button"
              disabled={!serviceManager || busy}
              onClick={() => void onImportLegacy()}
              className="inline-flex items-center justify-center rounded-full border border-foreground/12 bg-foreground/5 px-6 py-2.5 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07] disabled:opacity-50"
            >
              {busy ? "Importing…" : "Import previous local notebook"}
            </button>
          ) : null}
        </div>
        {err ? (
          <p className="mt-4 text-sm font-light text-risk" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function JupyterNotebookEditor({ notebookPath }: { notebookPath: string }) {
  const { baseUrl } = getPublicJupyterConfig();
  const router = useRouter();
  const jupyter = useLibreJupyterSession();
  const { resolvedTheme } = useTheme();
  const setJupyterColormode = useJupyterReactStore((s) => s.setColormode);
  const setActiveNotebookPath = useWorkbenchStore((s) => s.setActiveNotebookPath);
  const setActiveNotebookId = useWorkbenchStore((s) => s.setActiveNotebookId);

  const hostRef = useRef<HTMLDivElement>(null);

  const notebookId = notebookReactIdFromPath(notebookPath);

  const notebookReady =
    !jupyter.kernelIsLoading && !!jupyter.serviceManager && !!jupyter.kernel;

  const { nbformat, serverContentReady, loadError } = useNotebookServerPersistence(
    jupyter.serviceManager?.contents,
    notebookId,
    notebookPath,
    notebookReady,
    initialNotebook,
  );

  /** Global `notebookStore` survives React remounts — clear when switching files. */
  const notebookStorePathRef = useRef<string>("");
  if (notebookStorePathRef.current !== notebookPath) {
    notebookStore.getState().reset();
    notebookStorePathRef.current = notebookPath;
  }

  /** Dev-only console filtering; keep installed for the whole editor session (not only when kernel is ready). */
  ensureJupyterDevNoiseInstalledBeforeNotebook();
  useCodemirrorAutoCloseBrackets(hostRef, notebookReady);

  /**
   * Fresh extension per notebook session. A module-singleton extension reused across navigations
   * left JupyterLab holding stale cell refs (`cell.model` null / Yjs errors on route changes).
   */
  const cellExtensions = useMemo(
    () => [
      new CellSidebarExtension({
        factory: LibreCellSidebar,
        sidebarWidth: 48,
      }),
    ],
    // New extension when file changes; factory closure does not reference the path.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session identity
    [notebookPath],
  );

  /**
   * Cell sidebars can mount outside the `Notebook` React subtree, so they cannot rely on context.
   * Update the workbench store during render so the first paint sees `activeNotebookId` (before effects run).
   */
  useWorkbenchStore.setState({
    activeNotebookPath: notebookPath,
    activeNotebookId: notebookId,
  });

  useLayoutEffect(() => {
    return () => {
      setActiveNotebookPath(null);
      setActiveNotebookId(null);
      notebookStore.getState().reset();
    };
  }, [setActiveNotebookPath, setActiveNotebookId]);

  const themeColormode = resolvedTheme === "dark" ? "dark" : "light";
  useLayoutEffect(() => {
    setJupyterColormode(themeColormode);
  }, [setJupyterColormode, themeColormode]);

  useEffect(() => {
    loadJupyterLabPackageStylesOnce();
  }, []);

  useEffect(() => {
    return () => {
      teardownJupyterDevNoiseFromWorkbench();
    };
  }, []);

  if (jupyter.kernelIsLoading || !jupyter.serviceManager || !jupyter.kernel) {
    return (
      <div className="lq-workbench-notebook-root w-full min-h-[min(72vh,840px)]">
        <JupyterConnectingPanel baseUrl={baseUrl} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="glass rounded-4xl p-8 text-center text-sm font-light text-risk"
        role="alert"
      >
        <p className="heading-brand text-lg text-risk">Could not load notebook</p>
        <p className="mt-2 text-text-secondary">{loadError}</p>
        <Link
          href="/notebooks"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-alpha px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Back to library
        </Link>
      </div>
    );
  }

  if (!serverContentReady) {
    return (
      <div className="lq-workbench-notebook-root flex min-h-[min(72vh,840px)] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <Loader2
          className="size-8 animate-spin text-text-secondary"
          aria-hidden
        />
        <p className="text-sm font-light text-text-secondary">
          Loading notebook from server…
        </p>
      </div>
    );
  }

  const onRenamed = (newPath: string) => {
    router.replace(`/?path=${encodeURIComponent(newPath)}`);
  };

  return (
    <div className="lq-workbench-notebook-root w-full min-h-[min(72vh,840px)]">
      <JupyterReactTheme loadJupyterLabCss={false} backgroundColor="transparent">
        <NotebookWorkbenchProvider
          value={{
            notebookServerPath: notebookPath,
            contents: jupyter.serviceManager.contents,
            onRenamed,
          }}
        >
          <JupyterThemeLink />
          <PackageSearchModal notebookId={notebookId} />
          <OutputSanitizer containerRef={hostRef}>
            <div ref={hostRef} className="libre-notebook-host w-full">
              <Notebook
                key={notebookPath}
                id={notebookId}
                serviceManager={jupyter.serviceManager}
                kernel={jupyter.kernel}
                startDefaultKernel={false}
                nbformat={nbformat}
                path={notebookPath}
                height="min(72vh, 840px)"
                maxHeight="min(72vh, 840px)"
                cellSidebarMargin={52}
                extensions={cellExtensions}
                Toolbar={LibreNotebookToolbar}
              />
            </div>
          </OutputSanitizer>
        </NotebookWorkbenchProvider>
      </JupyterReactTheme>
    </div>
  );
}

export function JupyterWorkbench() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("path");
  const notebookPath = raw
    ? (() => {
        try {
          return decodeURIComponent(raw);
        } catch {
          return null;
        }
      })()
    : null;

  if (!notebookPath) {
    return <WorkspaceEmptyState />;
  }

  return <JupyterNotebookEditor notebookPath={notebookPath} />;
}
