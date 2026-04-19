/**
 * Browser capabilities for "Save as" to the user's machine (File System Access API).
 */

export function supportsNativeSaveFilePicker(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { showSaveFilePicker?: unknown };
  return typeof w.showSaveFilePicker === "function";
}
