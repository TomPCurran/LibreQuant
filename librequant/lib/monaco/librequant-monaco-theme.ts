import * as monaco from "monaco-editor";

const BRAND_TEAL = "#0d9488";

let themesRegistered = false;

/** Aligns with app/globals.css — dark mode “Fintech” surface */
const darkColors: Record<string, string> = {
  "editor.background": "#09090b",
  "editor.foreground": "#fafafa",
  "editorLineNumber.foreground": "#6e6e73",
  "editorLineNumber.activeForeground": "#a1a1aa",
  "editorCursor.foreground": BRAND_TEAL,
  "editor.selectionBackground": `${BRAND_TEAL}44`,
  "editor.inactiveSelectionBackground": `${BRAND_TEAL}22`,
  "editor.lineHighlightBackground": "#18181b",
  "editorWhitespace.foreground": "#3f3f46",
  "editorIndentGuide.background": "#27272a",
  "editorIndentGuide.activeBackground": "#3f3f46",
  "scrollbarSlider.background": "#3f3f4680",
  "scrollbarSlider.hoverBackground": "#52525b99",
  "scrollbarSlider.activeBackground": "#71717a99",
};

const lightColors: Record<string, string> = {
  "editor.background": "#f9f9fb",
  "editor.foreground": "#1d1d1f",
  "editorLineNumber.foreground": "#6e6e73",
  "editorLineNumber.activeForeground": "#52525b",
  "editorCursor.foreground": BRAND_TEAL,
  "editor.selectionBackground": `${BRAND_TEAL}33`,
  "editor.inactiveSelectionBackground": `${BRAND_TEAL}18`,
  "editor.lineHighlightBackground": "#f4f4f5",
  "editorWhitespace.foreground": "#d4d4d8",
  "editorIndentGuide.background": "#e4e4e7",
  "editorIndentGuide.activeBackground": "#d4d4d8",
  "scrollbarSlider.background": "#a1a1aa66",
  "scrollbarSlider.hoverBackground": "#71717a80",
  "scrollbarSlider.activeBackground": "#52525b99",
};

export function registerLibreQuantMonacoThemes(m: typeof monaco): void {
  if (themesRegistered) {
    return;
  }

  m.editor.defineTheme("librequant-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: darkColors,
  });

  m.editor.defineTheme("librequant-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: lightColors,
  });

  themesRegistered = true;
}

export function monacoThemeId(
  resolvedTheme: string | undefined
): "librequant-dark" | "librequant-light" {
  return resolvedTheme === "dark" ? "librequant-dark" : "librequant-light";
}
