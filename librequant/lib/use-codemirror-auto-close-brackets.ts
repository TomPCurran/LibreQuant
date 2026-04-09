"use client";

import { useEffect, type RefObject } from "react";
import { patchAutoCloseBracketsInContainer } from "@/lib/codemirror-auto-close-brackets";
import { observeMutationsRaf } from "@/lib/observe-mutations-raf";

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
    return observeMutationsRaf(
      root,
      () => {
        patchAutoCloseBracketsInContainer(root);
      },
      { childList: true, subtree: true },
    );
  }, [containerRef, enabled]);
}
