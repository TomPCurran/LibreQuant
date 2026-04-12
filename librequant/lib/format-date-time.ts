/**
 * Shared ISO-8601 display for library panels (notebook + strategy).
 */
export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(t);
}
