/** Route helpers for `/experiments` deep links (query synced with Zustand). */

export const EXPERIMENT_QUERY_KEY = "experiment";

export function experimentsPageHref(experimentName: string | null): string {
  if (!experimentName) return "/experiments";
  return `/experiments?${EXPERIMENT_QUERY_KEY}=${encodeURIComponent(experimentName)}`;
}
