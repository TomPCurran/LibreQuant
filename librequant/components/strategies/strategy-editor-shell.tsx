"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Loader2,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorkbenchShell } from "@/components/workbench-shell";
import { PythonCodeEditor } from "@/components/strategies/python-code-editor";
import { StrategyFileTree } from "@/components/strategies/strategy-file-tree";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import {
  buildImportSnippet,
  getTextFileContent,
  listFilesInDirectory,
  saveTextFileContent,
} from "@/lib/strategy-contents";
import type { StrategyFileItem } from "@/lib/types/strategy";
import { basenameFromPath, parentPath } from "@/lib/jupyter-paths";

const SAVE_DEBOUNCE_MS = 800;

export function StrategyEditorShell() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("path");
  const filePath = raw
    ? (() => {
        try {
          return decodeURIComponent(raw);
        } catch {
          return null;
        }
      })()
    : null;

  if (!filePath) {
    return (
      <WorkbenchShell
        sectionEyebrow="Strategy editor"
        title="No file selected"
        subtitle="Select a file from the strategy library."
      >
        <div className="glass rounded-4xl p-8 text-center">
          <p className="heading-brand text-lg text-text-primary">
            No file selected
          </p>
          <p className="mt-2 text-sm font-light text-text-secondary">
            Go to the{" "}
            <Link
              href="/strategies"
              className="font-medium text-alpha underline-offset-2 hover:underline"
            >
              strategy library
            </Link>{" "}
            and open a <code className="font-mono-code text-[12px]">.py</code>{" "}
            file.
          </p>
        </div>
      </WorkbenchShell>
    );
  }

  return <EditorWithFile filePath={filePath} />;
}

function EditorWithFile({ filePath }: { filePath: string }) {
  const { serviceManager, error: mgrError } = useJupyterServiceManager();
  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [files, setFiles] = useState<StrategyFileItem[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [copied, setCopied] = useState(false);

  const dirPath = parentPath(filePath);
  const fileName = basenameFromPath(filePath);
  const dirName = basenameFromPath(dirPath);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<string>("");

  useEffect(() => {
    setContent(null);
    setLoadError(null);
    setSaveState("idle");
  }, [filePath]);

  const loadFile = useCallback(async () => {
    if (!serviceManager) return;
    try {
      const text = await getTextFileContent(
        serviceManager.contents,
        filePath,
      );
      setContent(text);
      latestContentRef.current = text;
      setLoadError(null);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Failed to load file.",
      );
    }
  }, [serviceManager, filePath]);

  const loadFiles = useCallback(async () => {
    if (!serviceManager || !dirPath) return;
    try {
      const list = await listFilesInDirectory(
        serviceManager.contents,
        dirPath,
      );
      setFiles(list);
    } catch {
      /* silently ignore file tree load errors */
    }
  }, [serviceManager, dirPath]);

  useEffect(() => {
    void loadFile();
    void loadFiles();
  }, [loadFile, loadFiles]);

  const doSave = useCallback(
    async (text: string) => {
      if (!serviceManager) return;
      setSaveState("saving");
      try {
        await saveTextFileContent(serviceManager.contents, filePath, text);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("idle");
      }
    },
    [serviceManager, filePath],
  );

  const onChange = useCallback(
    (value: string) => {
      latestContentRef.current = value;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void doSave(value);
      }, SAVE_DEBOUNCE_MS);
    },
    [doSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (serviceManager && latestContentRef.current !== content) {
          void saveTextFileContent(
            serviceManager.contents,
            filePath,
            latestContentRef.current,
          );
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  const onCopyImport = async () => {
    const snippet = buildImportSnippet(filePath);
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onManualSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void doSave(latestContentRef.current);
  };

  const combinedError = mgrError ?? loadError;

  return (
    <WorkbenchShell
      sectionEyebrow={dirName}
      title={fileName}
      subtitle="Strategy editor — changes auto-save to your Jupyter workspace."
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/strategies"
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Library
          </Link>
          <button
            type="button"
            onClick={onManualSave}
            disabled={!serviceManager}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07] disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden />
            Save
          </button>
          <button
            type="button"
            onClick={() => void onCopyImport()}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-foreground/[0.07]"
          >
            <ClipboardCopy className="size-4" aria-hidden />
            {copied ? "Copied!" : "Copy import"}
          </button>

          <div className="ml-auto flex items-center gap-1.5 text-xs font-light text-text-secondary">
            {saveState === "saving" ? (
              <>
                <Loader2
                  className="size-3.5 animate-spin text-alpha"
                  aria-hidden
                />
                Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="size-3.5 text-alpha" aria-hidden />
                Saved
              </>
            ) : null}
          </div>
        </div>

        {combinedError ? (
          <div
            className="rounded-3xl border border-risk/30 bg-risk/5 px-4 py-3 text-sm font-light text-risk"
            role="alert"
          >
            {combinedError}
          </div>
        ) : null}

        {content === null && !combinedError ? (
          <div className="flex min-h-[400px] items-center justify-center text-sm font-light text-text-secondary">
            <Loader2
              className="mr-2 size-5 animate-spin text-alpha"
              aria-hidden
            />
            Loading file…
          </div>
        ) : null}

        {content !== null ? (
          <div className="flex min-h-[calc(100vh-280px)] overflow-hidden rounded-xl border border-foreground/8">
            {serviceManager ? (
              <div className="w-48 shrink-0">
                <StrategyFileTree
                  dirPath={dirPath}
                  files={files}
                  activePath={filePath}
                  contents={serviceManager.contents}
                  onRefresh={() => void loadFiles()}
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <PythonCodeEditor
                key={filePath}
                initialValue={content}
                onChange={onChange}
              />
            </div>
          </div>
        ) : null}
      </div>
    </WorkbenchShell>
  );
}
