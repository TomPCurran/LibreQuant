/**
 * Jupyter Contents API helpers for the **notebook** library: ensure directories, create notebooks,
 * list/rename/delete, and recursive delete with bounded concurrency.
 *
 * @module jupyter-contents
 */

export type { NotebookListItem, NotebookFolderItem } from "@/lib/types/notebook";

export { ensureDirectory } from "./ensure-directory";
export {
  listNotebooksInLibrary,
  listDataUploadFiles,
  listDataLibraryDirectory,
  listDataUploadsSubfolders,
  listDataUploadFilesRecursive,
  listNotebookFolders,
  getNotebookJson,
} from "./read";
export {
  renameDataLibraryEntry,
  moveDataLibraryEntry,
  renameNotebookPath,
  moveNotebookToFolder,
} from "./rename";
export {
  createDataLibraryFolder,
  createNotebookFolder,
  saveNotebookJson,
  createUntitledNotebook,
  uploadBinaryFile,
  uploadNotebookFile,
  deleteRecursive,
  deleteNotebookPath,
  deleteDataLibraryEntry,
} from "./write";
export {
  assertPathUnderDataUploads,
  relativePathWithinDataUploads,
  dataUploadsRootPath,
  parseRelativeUploadsDir,
  type DataUploadFileItem,
  type DataLibraryEntry,
  type UploadsFolderOption,
} from "./types";
