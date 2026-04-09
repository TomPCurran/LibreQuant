"use client";

import DOMPurify from "dompurify";
import {
  useEffect,
  type ReactNode,
  type RefObject,
} from "react";
import { observeMutationsRaf } from "@/lib/observe-mutations-raf";

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["svg", "path", "g", "circle", "line", "rect", "text"],
    ADD_ATTR: ["viewBox", "xmlns", "fill", "stroke", "d"],
  });
}

function sanitizeSubtree(root: HTMLElement) {
  const targets = root.querySelectorAll<HTMLElement>(
    ".jp-RenderedHTMLCommon, .jp-RenderedHTMLCommon *"
  );
  targets.forEach((el) => {
    if (
      el.classList.contains("jp-RenderedHTMLCommon") &&
      el.innerHTML &&
      !el.dataset.lqSanitized
    ) {
      el.innerHTML = sanitizeHtml(el.innerHTML);
      el.dataset.lqSanitized = "1";
    }
  });
}

export function OutputSanitizer({
  children,
  containerRef,
}: {
  children: ReactNode;
  containerRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    sanitizeSubtree(root);

    return observeMutationsRaf(
      root,
      () => {
        sanitizeSubtree(root);
      },
      { childList: true, subtree: true },
    );
  }, [containerRef]);

  return <>{children}</>;
}
