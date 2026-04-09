/** Conservative allowlist for `%pip install` (no spaces or shell metacharacters). */
export function isSafePyPIProjectName(name: string): boolean {
  if (name.length < 1 || name.length > 200) return false;
  return /^[a-zA-Z0-9._-]+$/.test(name);
}
