import { useCallback, useEffect, useState } from "react";

import { listNotebookFolders } from "@/lib/jupyter-contents";
import type { NotebookFolderItem } from "@/lib/types/notebook";
import type { ServiceManager } from "@jupyterlab/services";

export function useNotebookLibrary(
  libraryRoot: string,
  serviceManager: ServiceManager.IManager | null,
) {
  const [folders, setFolders] = useState<NotebookFolderItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!serviceManager) return;
    setListError(null);
    setLoading(true);
    try {
      const list = await listNotebookFolders(
        serviceManager.contents,
        libraryRoot,
      );
      setFolders(list);
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Failed to list notebooks.",
      );
    } finally {
      setLoading(false);
    }
  }, [libraryRoot, serviceManager]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    folders,
    setFolders,
    listError,
    setListError,
    loading,
    refresh,
  };
}
