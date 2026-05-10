"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DATA_SOURCES_CHANGED_EVENT,
} from "@/lib/data-sources/constants";
import { clientError } from "@/lib/client-log";
import {
  createDataLibraryFolder,
  listDataUploadsSubfolders,
  moveDataLibraryEntry,
  type DataLibraryEntry,
  type UploadsFolderOption,
} from "@/lib/jupyter-contents";
import type { ServiceManager } from "@jupyterlab/services";

import {
  confirmDeleteDataLibraryEntry,
  confirmMoveDataLibraryEntry,
  confirmRenameDataLibraryEntry,
} from "./data-library-dialog-confirms";
import { computeMoveFolderOptions } from "./data-library-move-options";
import { canDropInto } from "./data-library-helpers";
import type {
  DeleteState,
  MoveState,
  RenameState,
} from "./data-library-dialog-state";

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
}

export type UseDataLibraryMutationsParams = {
  serviceManager: ServiceManager.IManager | null;
  blocked: boolean;
  libraryRoot: string;
  refreshTree: () => Promise<void>;
  loadDirectory: (rel: string) => Promise<void>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setStatusMsg: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useDataLibraryMutations({
  serviceManager,
  blocked,
  libraryRoot,
  refreshTree,
  loadDirectory,
  setExpanded,
  setBusy,
  setStatusMsg,
}: UseDataLibraryMutationsParams) {
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [moveState, setMoveState] = useState<MoveState | null>(null);
  const [moveTargetRel, setMoveTargetRel] = useState("");
  const [folderOptions, setFolderOptions] = useState<UploadsFolderOption[]>(
    [],
  );

  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

  const [inlineNewFolderAt, setInlineNewFolderAt] = useState<string | null>(
    null,
  );
  const [inlineNewFolderName, setInlineNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const loadFolderOptions = useCallback(async () => {
    if (!serviceManager) return;
    try {
      const opts = await listDataUploadsSubfolders(
        serviceManager.contents,
        libraryRoot,
      );
      setFolderOptions(opts);
    } catch {
      setFolderOptions([{ relative: "", label: "data/uploads" }]);
    }
  }, [serviceManager, libraryRoot]);

  useEffect(() => {
    if (moveState) void loadFolderOptions();
  }, [moveState, loadFolderOptions]);

  useEffect(() => {
    if (inlineNewFolderAt !== null) {
      queueMicrotask(() => newFolderInputRef.current?.focus());
    }
  }, [inlineNewFolderAt]);

  const moveFolderOptions = useMemo(
    () =>
      computeMoveFolderOptions(
        folderOptions,
        moveState,
        libraryRoot,
        serviceManager,
      ),
    [folderOptions, moveState, libraryRoot, serviceManager],
  );

  const performMove = useCallback(
    async (sourcePath: string, sourceIsDir: boolean, targetRel: string) => {
      if (!serviceManager) return;
      if (!canDropInto(libraryRoot, sourcePath, sourceIsDir, targetRel)) {
        setStatusMsg("Cannot move there.");
        return;
      }
      setBusy(true);
      setStatusMsg(null);
      try {
        await moveDataLibraryEntry(
          serviceManager.contents,
          libraryRoot,
          sourcePath,
          targetRel,
        );
        setStatusMsg("Moved.");
        notifyChanged();
        await refreshTree();
      } catch (e) {
        clientError("Move failed", e);
        setStatusMsg(e instanceof Error ? e.message : "Move failed.");
      } finally {
        setBusy(false);
      }
    },
    [serviceManager, libraryRoot, refreshTree, setBusy, setStatusMsg],
  );

  const submitInlineNewFolder = useCallback(async () => {
    if (
      !serviceManager ||
      blocked ||
      !inlineNewFolderName.trim() ||
      inlineNewFolderAt === null
    ) {
      return;
    }
    const parentRel = inlineNewFolderAt;
    setBusy(true);
    setStatusMsg(null);
    try {
      await createDataLibraryFolder(
        serviceManager.contents,
        libraryRoot,
        parentRel,
        inlineNewFolderName.trim(),
      );
      setInlineNewFolderAt(null);
      setInlineNewFolderName("");
      setStatusMsg("Folder created.");
      notifyChanged();
      if (parentRel) {
        setExpanded((prev) => new Set(prev).add(parentRel));
      }
      await loadDirectory(parentRel || "");
    } catch (e) {
      clientError("Could not create folder", e);
      setStatusMsg(
        e instanceof Error ? e.message : "Could not create folder.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    serviceManager,
    blocked,
    inlineNewFolderName,
    inlineNewFolderAt,
    libraryRoot,
    loadDirectory,
    setBusy,
    setStatusMsg,
    setExpanded,
  ]);

  const openInlineNewFolder = useCallback((parentRel: string) => {
    setInlineNewFolderAt(parentRel);
    setInlineNewFolderName("");
  }, []);

  const cancelInlineNewFolder = useCallback(() => {
    setInlineNewFolderAt(null);
    setInlineNewFolderName("");
  }, []);

  const onConfirmRename = async () => {
    if (!serviceManager || !renameState || !renameValue.trim()) return;
    await confirmRenameDataLibraryEntry({
      serviceManager,
      libraryRoot,
      renameState,
      renameValue,
      setBusy,
      setStatusMsg,
      setRenameState,
      setRenameValue,
      refreshTree,
    });
  };

  const onConfirmMove = async () => {
    if (!serviceManager || !moveState) return;
    await confirmMoveDataLibraryEntry({
      serviceManager,
      libraryRoot,
      moveState,
      moveTargetRel,
      setBusy,
      setStatusMsg,
      setMoveState,
      refreshTree,
    });
  };

  const onConfirmDelete = async () => {
    if (!serviceManager || !deleteState) return;
    await confirmDeleteDataLibraryEntry({
      serviceManager,
      libraryRoot,
      deleteState,
      setBusy,
      setStatusMsg,
      setDeleteState,
      refreshTree,
    });
  };

  const handleRenameClick = useCallback(
    (entry: DataLibraryEntry, isDir: boolean) => {
      setRenameState({
        path: entry.path,
        name: entry.name,
        isDir,
      });
      setRenameValue(entry.name);
    },
    [],
  );

  const handleMoveClick = useCallback((entry: DataLibraryEntry, isDir: boolean) => {
    setMoveTargetRel("");
    setMoveState({
      path: entry.path,
      name: entry.name,
      isDir,
    });
  }, []);

  const handleDeleteClick = useCallback(
    (entry: DataLibraryEntry, isDir: boolean) => {
      setDeleteState({
        path: entry.path,
        name: entry.name,
        isDir,
      });
    },
    [],
  );

  return {
    renameState,
    renameValue,
    setRenameValue,
    moveState,
    moveTargetRel,
    setMoveTargetRel,
    moveFolderOptions,
    deleteState,
    inlineNewFolderAt,
    inlineNewFolderName,
    setInlineNewFolderName,
    newFolderInputRef,
    performMove,
    submitInlineNewFolder,
    openInlineNewFolder,
    cancelInlineNewFolder,
    onConfirmRename,
    onConfirmMove,
    onConfirmDelete,
    handleRenameClick,
    handleMoveClick,
    handleDeleteClick,
    setRenameState,
    setMoveState,
    setDeleteState,
  };
}
