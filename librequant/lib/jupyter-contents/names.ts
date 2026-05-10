export function uniqueBasenameInSet(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  const lastDot = base.lastIndexOf(".");
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base;
  const ext = lastDot > 0 ? base.slice(lastDot) : "";
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

export function uniqueName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  const stem = base.toLowerCase().endsWith(".ipynb")
    ? base.slice(0, -".ipynb".length)
    : base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-${i}.ipynb`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${stem}-${Date.now()}.ipynb`;
}
