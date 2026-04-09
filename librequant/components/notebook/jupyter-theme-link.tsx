"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const LINK_ID = "lq-jupyter-theme-variables";

/**
 * Injects JupyterLab :root theme variables via static CSS (see scripts/copy-jupyter-theme-css.mjs).
 * Replaces the broken variables.css?raw dynamic import inside JupyterLabCss under Turbopack.
 */
export function JupyterThemeLink() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    document.getElementById(LINK_ID)?.remove();
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = `/jupyter/variables-${mode}.css`;
    document.head.appendChild(link);
    return () => {
      if (document.getElementById(LINK_ID) === link) {
        link.remove();
      }
    };
  }, [resolvedTheme]);

  return null;
}
