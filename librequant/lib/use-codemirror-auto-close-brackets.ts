"use client";

import { useEffect, type RefObject } from "react";
import { patchAutoCloseBracketsInContainer } from "@/lib/codemirror-auto-close-brackets";

/**
 * Enables CodeMirror auto-closing brackets/quotes for all cell editors under `containerRef`.
 */
export function useCodemirrorAutoCloseBrackets(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;

    patchAutoCloseBracketsInContainer(root);
    const obs = new MutationObserver(() => {
      patchAutoCloseBracketsInContainer(root);
    });
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [containerRef, enabled]);
}
