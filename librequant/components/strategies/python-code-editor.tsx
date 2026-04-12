"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
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
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef<Compartment | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  const themeExtensions = useCallback((dark: boolean) => {
    return dark ? [oneDark, DARK_EXTRA] : [LIGHT_THEME];
  }, []);

  const createState = useCallback(
    (doc: string, dark: boolean, themeComp: Compartment) => {
      const saveMap = keymap.of([
        {
          key: "Mod-s",
          preventDefault: true,
          run: () => {
            onSaveRef.current?.();
            return true;
          },
        },
      ]);

      return EditorState.create({
        doc,
        extensions: [
          basicSetup,
          python(),
          themeComp.of(themeExtensions(dark)),
          Prec.highest(saveMap),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString());
            }
          }),
          EditorView.lineWrapping,
        ].flat(),
      });
    },
    [themeExtensions],
  );

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const themeComp = new Compartment();
    themeCompartmentRef.current = themeComp;

    const view = new EditorView({
      state: createState(initialValue, isDark, themeComp),
      parent: el,
    });

    viewRef.current = view;

    return () => {
      themeCompartmentRef.current = null;
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    const comp = themeCompartmentRef.current;
    if (!view || !comp) return;

    view.dispatch({
      effects: comp.reconfigure(themeExtensions(isDark)),
    });
  }, [isDark, themeExtensions]);

  return (
    <div
      ref={editorRef}
      className={`h-full min-h-0 overflow-hidden rounded-xl border border-foreground/8 ${className}`}
    />
  );
}
