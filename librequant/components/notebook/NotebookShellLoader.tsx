"use client";

import "./jupyter-webpack-globals";
import { useEffect, useState, type ComponentType } from "react";

/**
 * Loads the notebook shell only after mount (client-only). Avoids `next/dynamic`
 * + `import()` quirks under Turbopack where the module object can be undefined.
 */
export default function NotebookShellLoader() {
  const [Shell, setShell] = useState<ComponentType<object> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./NotebookShell")
      .then((mod) => {
        if (cancelled || !mod?.default) return;
        setShell(() => mod.default);
      })
      .catch(() => {
        /* optional: surface load error in UI */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Shell) {
    return (
      <div
        className="glass flex min-h-112 w-full max-w-7xl items-center justify-center rounded-xl px-4 py-12 text-sm text-brand-gray"
        role="status"
        aria-live="polite"
      >
        Loading notebook…
      </div>
    );
  }

  return <Shell />;
}
