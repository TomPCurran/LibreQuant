/**
 * Like `Promise.all(items.map(fn))` but with a bounded concurrency limit.
 *
 * Prevents large fan-outs from opening too many simultaneous HTTP requests
 * against the Jupyter server (or any other backend).
 *
 * @param items - Input sequence; order is preserved in the result array.
 * @param fn - Async mapper invoked per item (receives the item and its index).
 * @param concurrency - Maximum number of in-flight `fn` calls (minimum 1 effective).
 * @returns Array of results in the same order as `items`.
 */
export async function pMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
