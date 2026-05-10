"use client";

import type { OnMount } from "@monaco-editor/react";
import type { IDisposable } from "monaco-editor";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { registerStrategyPythonCompletions } from "@/lib/monaco-strategy-completions";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 items-center justify-center text-sm text-text-secondary">
      Loading editor…
    </div>
  ),
});

interface PythonCodeEditorProps {
  initialValue: string;
  onChange?: (value: string) => void;
  /** Cmd-S / Ctrl-S — e.g. flush debounced save to the server */
  onSave?: () => void;
  className?: string;
}

export function PythonCodeEditor({
  initialValue,
  onChange,
  onSave,
  className = "",
}: PythonCodeEditorProps) {
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const completionDisposableRef = useRef<IDisposable | null>(null);
  const [loaderReady, setLoaderReady] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ loader }, monaco] = await Promise.all([
        import("@monaco-editor/react"),
        import("monaco-editor"),
      ]);
      if (cancelled) return;
      loader.config({ monaco });
      setLoaderReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  });

  const handleMount: OnMount = useCallback((editor, monaco) => {
    completionDisposableRef.current?.dispose();
    completionDisposableRef.current = registerStrategyPythonCompletions(monaco);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current?.();
    });
  }, []);

  useEffect(() => {
    return () => {
      completionDisposableRef.current?.dispose();
      completionDisposableRef.current = null;
    };
  }, []);

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-foreground/8 ${className}`}
      style={{ background: "hsl(var(--editor-surface))" }}
    >
      <div className="min-h-0 flex-1">
        {loaderReady ? (
          <Editor
            height="100%"
            language="python"
            theme={isDark ? "vs-dark" : "light"}
            defaultValue={initialValue}
            onChange={(value) => onChangeRef.current?.(value ?? "")}
            onMount={handleMount}
            options={{
              minimap: { enabled: true },
              wordWrap: "on",
              automaticLayout: true,
              fontSize: 14,
              bracketPairColorization: { enabled: true },
              suggestOnTriggerCharacters: true,
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
            }}
          />
        ) : (
          <div className="flex h-full min-h-0 items-center justify-center text-sm text-text-secondary">
            Loading editor…
          </div>
        )}
      </div>
    </div>
  );
}
