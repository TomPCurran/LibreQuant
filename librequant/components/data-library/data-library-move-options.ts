import {
  relativePathWithinDataUploads,
  type UploadsFolderOption,
} from "@/lib/jupyter-contents";
import type { ServiceManager } from "@jupyterlab/services";

import { parentRelative } from "./data-library-helpers";
import type { MoveState } from "./data-library-dialog-state";

export function computeMoveFolderOptions(
  folderOptions: UploadsFolderOption[],
  moveState: MoveState | null,
  libraryRoot: string,
  serviceManager: ServiceManager.IManager | null,
): UploadsFolderOption[] {
  if (!moveState || !serviceManager) return folderOptions;
  try {
    const sourceRel = relativePathWithinDataUploads(
      libraryRoot,
      moveState.path,
    );
    if (moveState.isDir) {
      return folderOptions.filter(
        (o) =>
          o.relative !== sourceRel &&
          !o.relative.startsWith(`${sourceRel}/`),
      );
    }
    const sourceParent = parentRelative(sourceRel);
    return folderOptions.filter(
      (o) => sourceParent === "" || o.relative !== sourceParent,
    );
  } catch {
    return folderOptions;
  }
}
