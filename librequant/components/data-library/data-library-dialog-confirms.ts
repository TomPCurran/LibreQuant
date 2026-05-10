import {
  DATA_SOURCES_CHANGED_EVENT,
} from "@/lib/data-sources/constants";
import { clientError } from "@/lib/client-log";
import {
  deleteDataLibraryEntry,
  moveDataLibraryEntry,
  renameDataLibraryEntry,
} from "@/lib/jupyter-contents";
import type { ServiceManager } from "@jupyterlab/services";

import type {
  DeleteState,
  MoveState,
  RenameState,
} from "./data-library-dialog-state";

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
}

export async function confirmRenameDataLibraryEntry(opts: {
  serviceManager: ServiceManager.IManager;
  libraryRoot: string;
  renameState: RenameState;
  renameValue: string;
  setBusy: (v: boolean) => void;
  setStatusMsg: (v: string | null) => void;
  setRenameState: (v: RenameState | null) => void;
  setRenameValue: (v: string) => void;
  refreshTree: () => Promise<void>;
}): Promise<void> {
  const {
    serviceManager,
    libraryRoot,
    renameState,
    renameValue,
    setBusy,
    setStatusMsg,
    setRenameState,
    setRenameValue,
    refreshTree,
  } = opts;
  if (!renameValue.trim()) return;
  setBusy(true);
  setStatusMsg(null);
  try {
    await renameDataLibraryEntry(
      serviceManager.contents,
      libraryRoot,
      renameState.path,
      renameValue.trim(),
    );
    setRenameState(null);
    setRenameValue("");
    setStatusMsg("Renamed.");
    notifyChanged();
    await refreshTree();
  } catch (e) {
    clientError("Rename failed", e);
    setStatusMsg(e instanceof Error ? e.message : "Rename failed.");
  } finally {
    setBusy(false);
  }
}

export async function confirmMoveDataLibraryEntry(opts: {
  serviceManager: ServiceManager.IManager;
  libraryRoot: string;
  moveState: MoveState;
  moveTargetRel: string;
  setBusy: (v: boolean) => void;
  setStatusMsg: (v: string | null) => void;
  setMoveState: (v: MoveState | null) => void;
  refreshTree: () => Promise<void>;
}): Promise<void> {
  const {
    serviceManager,
    libraryRoot,
    moveState,
    moveTargetRel,
    setBusy,
    setStatusMsg,
    setMoveState,
    refreshTree,
  } = opts;
  setBusy(true);
  setStatusMsg(null);
  try {
    await moveDataLibraryEntry(
      serviceManager.contents,
      libraryRoot,
      moveState.path,
      moveTargetRel,
    );
    setMoveState(null);
    setStatusMsg("Moved.");
    notifyChanged();
    await refreshTree();
  } catch (e) {
    clientError("Move failed (dialog)", e);
    setStatusMsg(e instanceof Error ? e.message : "Move failed.");
  } finally {
    setBusy(false);
  }
}

export async function confirmDeleteDataLibraryEntry(opts: {
  serviceManager: ServiceManager.IManager;
  libraryRoot: string;
  deleteState: DeleteState;
  setBusy: (v: boolean) => void;
  setStatusMsg: (v: string | null) => void;
  setDeleteState: (v: DeleteState | null) => void;
  refreshTree: () => Promise<void>;
}): Promise<void> {
  const {
    serviceManager,
    libraryRoot,
    deleteState,
    setBusy,
    setStatusMsg,
    setDeleteState,
    refreshTree,
  } = opts;
  setBusy(true);
  setStatusMsg(null);
  try {
    await deleteDataLibraryEntry(
      serviceManager.contents,
      libraryRoot,
      deleteState.path,
    );
    setDeleteState(null);
    setStatusMsg("Deleted.");
    notifyChanged();
    await refreshTree();
  } catch (e) {
    clientError("Delete failed", e);
    setStatusMsg(e instanceof Error ? e.message : "Delete failed.");
  } finally {
    setBusy(false);
  }
}
