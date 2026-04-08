"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import {
  monacoThemeId,
  registerLibreQuantMonacoThemes,
} from "../../lib/monaco/librequant-monaco-theme";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[150px] rounded-md border border-black/6 bg-background dark:border-white/10"
      aria-hidden
    />
  ),
});

export type NotebookCellProps = {
  cellId: string;
  cellIndex: number;
  content: string;
  hasRun: boolean;
  lastLog?: string;
  onChangeContent: (id: string, content: string) => void;
  onRun: (id: string) => void;
};

const MIN_EDITOR_PX = 150;

export default function NotebookCell({
  cellId,
  cellIndex,
  content,
  hasRun,
  lastLog,
  onChangeContent,
  onRun,
}: NotebookCellProps) {
  const { resolvedTheme } = useTheme();
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_PX);
  const [runPulse, setRunPulse] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const theme = monacoThemeId(resolvedTheme);

  const beforeMount = useCallback((monaco: typeof import("monaco-editor")) => {
    registerLibreQuantMonacoThemes(monaco);
  }, []);

  const onMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed;

    const syncHeight = () => {
      const h = ed.getContentHeight();
      setEditorHeight(Math.max(MIN_EDITOR_PX, h));
    };

    syncHeight();
    ed.onDidContentSizeChange(syncHeight);
  }, []);

  useEffect(() => {
    editorRef.current?.layout();
  }, [resolvedTheme]);

  const handleRun = () => {
    setRunPulse(true);
    window.setTimeout(() => setRunPulse(false), 3000);
    onRun(cellId);
  };

  return (
    <section
      className={`glass overflow-hidden rounded-xl shadow-md shadow-foreground/5 ${runPulse ? "animate-soft-pulse-once" : ""}`}
      aria-label={`Python input cell ${cellIndex}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 bg-white/40 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/50">
        <span className="font-mono-code text-xs text-brand-gray">
          IN [{cellIndex}]:
        </span>
        <button
          type="button"
          onClick={handleRun}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/8 bg-white/80 px-2.5 py-1.5 text-sm transition hover:bg-white dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
          aria-label={`Run cell ${cellIndex}`}
        >
          <Play className="h-4 w-4 shrink-0 text-brand-teal" strokeWidth={2} />
          <span className="heading-brand text-foreground">Run</span>
        </button>
      </header>

      <div className="border-b border-black/6 bg-background dark:border-white/10">
        <Editor
          height={editorHeight}
          language="python"
          theme={theme}
          value={content}
          beforeMount={beforeMount}
          onMount={onMount}
          onChange={(value) => onChangeContent(cellId, value ?? "")}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily:
              "var(--font-jetbrains-mono), ui-monospace, monospace",
            padding: { top: 8, bottom: 8 },
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </div>

      {hasRun ? (
        <div
          className="border-t border-black/6 bg-background/80 px-3 py-2 dark:border-white/10"
          role="region"
          aria-label="Execution logs"
        >
          <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-brand-gray">
            Execution logs
          </p>
          <pre className="font-mono-code text-xs leading-relaxed text-foreground">
            {lastLog ?? "—"}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
