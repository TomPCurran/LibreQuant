"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

const LIGHT_THEME = EditorView.theme({
  "&": {
    backgroundColor: "hsl(40 18% 97%)",
    color: "hsl(240 6% 10%)",
    fontSize: "13.5px",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    padding: "12px 0",
    caretColor: "hsl(173 80% 36%)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "hsl(173 80% 36%)",
  },
  ".cm-gutters": {
    backgroundColor: "hsl(240 6% 95%)",
    color: "hsl(240 4% 55%)",
    borderRight: "1px solid hsl(240 6% 90%)",
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    fontSize: "12px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "hsl(173 80% 36% / 0.08)",
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(173 80% 36% / 0.04)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "hsl(173 80% 36% / 0.15) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "hsl(173 80% 36% / 0.2)",
    outline: "1px solid hsl(173 80% 36% / 0.4)",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});

const DARK_EXTRA = EditorView.theme({
  "&": {
    fontSize: "13.5px",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    padding: "12px 0",
  },
  ".cm-gutters": {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    fontSize: "12px",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});

interface PythonCodeEditorProps {
  initialValue: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function PythonCodeEditor({
  initialValue,
  onChange,
  className = "",
}: PythonCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  onChangeRef.current = onChange;

  const createState = useCallback(
    (doc: string, dark: boolean) => {
      return EditorState.create({
        doc,
        extensions: [
          basicSetup,
          python(),
          dark ? oneDark : LIGHT_THEME,
          dark ? DARK_EXTRA : [],
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString());
            }
          }),
          EditorView.lineWrapping,
        ].flat(),
      });
    },
    [],
  );

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const view = new EditorView({
      state: createState(initialValue, isDark),
      parent: el,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only re-mount when container element changes; theme/content updates are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    view.setState(createState(currentDoc, isDark));
  }, [isDark, createState]);

  return (
    <div
      ref={editorRef}
      className={`h-full min-h-0 overflow-hidden rounded-xl border border-foreground/8 ${className}`}
    />
  );
}
