type Tree = ReturnType<
  typeof import("./use-data-library-tree").useDataLibraryTree
>;
type Mutations = ReturnType<
  typeof import("./use-data-library-mutations").useDataLibraryMutations
>;
type Uploads = ReturnType<
  typeof import("./use-data-library-uploads").useDataLibraryUploads
>;

/** Builds the composed object returned by {@link useDataLibrary}. */
export function buildUseDataLibraryReturn(
  blocked: boolean,
  uploadsPrefix: string,
  busy: boolean,
  statusMsg: string | null,
  tree: Tree,
  mutations: Mutations,
  uploads: Uploads,
) {
  return {
    blocked,
    uploadsPrefix,
    fileInputId: uploads.fileInputId,
    dirInputId: uploads.dirInputId,
    fileInputRef: uploads.fileInputRef,
    dirInputRef: uploads.dirInputRef,
    cache: tree.cache,
    expanded: tree.expanded,
    loadingRels: tree.loadingRels,
    rootLoading: tree.rootLoading,
    listError: tree.listError,
    busy,
    statusMsg,
    dragOverRel: uploads.dragOverRel,
    renameState: mutations.renameState,
    renameValue: mutations.renameValue,
    setRenameValue: mutations.setRenameValue,
    moveState: mutations.moveState,
    moveTargetRel: mutations.moveTargetRel,
    setMoveTargetRel: mutations.setMoveTargetRel,
    moveFolderOptions: mutations.moveFolderOptions,
    deleteState: mutations.deleteState,
    inlineNewFolderAt: mutations.inlineNewFolderAt,
    inlineNewFolderName: mutations.inlineNewFolderName,
    setInlineNewFolderName: mutations.setInlineNewFolderName,
    newFolderInputRef: mutations.newFolderInputRef,
    rootEntries: tree.rootEntries,
    refreshTree: tree.refreshTree,
    toggleExpand: tree.toggleExpand,
    onRowDragStart: uploads.onRowDragStart,
    onDropTarget: uploads.onDropTarget,
    onDragOverDropZone: uploads.onDragOverDropZone,
    onDragLeaveZone: uploads.onDragLeaveZone,
    onPickFiles: uploads.onPickFiles,
    onPickDirectory: uploads.onPickDirectory,
    submitInlineNewFolder: mutations.submitInlineNewFolder,
    openInlineNewFolder: mutations.openInlineNewFolder,
    cancelInlineNewFolder: mutations.cancelInlineNewFolder,
    onConfirmRename: mutations.onConfirmRename,
    onConfirmMove: mutations.onConfirmMove,
    onConfirmDelete: mutations.onConfirmDelete,
    handleRenameClick: mutations.handleRenameClick,
    handleMoveClick: mutations.handleMoveClick,
    handleDeleteClick: mutations.handleDeleteClick,
    setRenameState: mutations.setRenameState,
    setMoveState: mutations.setMoveState,
    setDeleteState: mutations.setDeleteState,
  };
}
