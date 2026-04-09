/**
 * Coalesces MutationObserver notifications to at most one callback per animation frame,
 * reducing main-thread work when third-party code mutates the DOM many times in a tick.
 */
export function observeMutationsRaf(
  root: HTMLElement,
  onFlush: () => void,
  options: MutationObserverInit,
): () => void {
  let rafId = 0;

  const flush = () => {
    rafId = 0;
    onFlush();
  };

  const observer = new MutationObserver(() => {
    if (rafId !== 0) return;
    rafId = requestAnimationFrame(flush);
  });

  observer.observe(root, options);

  return () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    observer.disconnect();
  };
}
