"use client";

import DOMPurify from "dompurify";
import {
  useEffect,
  type ReactNode,
  type RefObject,
} from "react";

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

    const observer = new MutationObserver(() => {
      sanitizeSubtree(root);
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerRef]);

  return <>{children}</>;
}
