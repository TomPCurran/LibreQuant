"use client";

import { useState } from "react";

import { getDataUploadsRelativePrefix } from "@/lib/data-sources/constants";
import { getNotebookLibraryRoot } from "@/lib/env";
import { useJupyterReachability } from "@/lib/jupyter-reachability-context";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import { useHasMounted } from "@/lib/use-has-mounted";

import { buildUseDataLibraryReturn } from "./use-data-library-return";
import { useDataLibraryMutations } from "./use-data-library-mutations";
import { useDataLibraryTree } from "./use-data-library-tree";
import { useDataLibraryUploads } from "./use-data-library-uploads";

export function useDataLibrary() {
  const { reachable } = useJupyterReachability();
  const { serviceManager, error: smError } = useJupyterServiceManager();
  const hasMounted = useHasMounted();
  const blocked =
    !hasMounted || !reachable || !serviceManager || Boolean(smError);
  const libraryRoot = getNotebookLibraryRoot();
  const uploadsPrefix = getDataUploadsRelativePrefix();

  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const tree = useDataLibraryTree({
    serviceManager,
    blocked,
    libraryRoot,
    setStatusMsg,
  });

  const mutations = useDataLibraryMutations({
    serviceManager,
    blocked,
    libraryRoot,
    refreshTree: tree.refreshTree,
    loadDirectory: tree.loadDirectory,
    setExpanded: tree.setExpanded,
    setBusy,
    setStatusMsg,
  });

  const uploads = useDataLibraryUploads({
    serviceManager,
    blocked,
    libraryRoot,
    uploadsPrefix,
    cache: tree.cache,
    loadDirectory: tree.loadDirectory,
    refreshTree: tree.refreshTree,
    setExpanded: tree.setExpanded,
    setBusy,
    setStatusMsg,
    performMove: mutations.performMove,
  });

  return buildUseDataLibraryReturn(
    blocked,
    uploadsPrefix,
    busy,
    statusMsg,
    tree,
    mutations,
    uploads,
  );
}
