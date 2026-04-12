"use client";

import { useCallback, useState } from "react";

function readPersistedSet(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function writePersistedSet(storageKey: string, set: Set<string>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/**
 * Persists expanded folder paths in `localStorage` (JSON string array), keyed per sidebar.
 */
export function usePersistedExpandedSet(storageKey: string): {
  expanded: Set<string>;
  togglePath: (path: string) => void;
} {
  const [expanded, setExpanded] = useState(() => readPersistedSet(storageKey));

  const togglePath = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        writePersistedSet(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  return { expanded, togglePath };
}
