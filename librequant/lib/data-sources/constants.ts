/**
 * Jupyter contents paths for data uploads (under the notebook library root).
 *
 * @module data-sources/constants
 */

/** Path segments under the notebook library root, e.g. ``data/uploads/file.csv`` */
export function getDataUploadsRelativePrefix(): string {
  return "data/uploads";
}

/** Window event: credentials saved or file uploaded — shell sidebar listens to refresh. */
export const DATA_SOURCES_CHANGED_EVENT = "librequant:data-sources-changed";
