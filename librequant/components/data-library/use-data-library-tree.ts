"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DATA_SOURCES_CHANGED_EVENT,
} from "@/lib/data-sources/constants";
import { clientError } from "@/lib/client-log";
import {
  listDataLibraryDirectory,
  type DataLibraryEntry,
} from "@/lib/jupyter-contents";
import type { ServiceManager } from "@jupyterlab/services";

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(DATA_SOURCES_CHANGED_EVENT));
}

export type UseDataLibraryTreeParams = {
  serviceManager: ServiceManager.IManager | null;
  blocked: boolean;
  libraryRoot: string;
  setStatusMsg: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useDataLibraryTree({
  serviceManager,
  blocked,
  libraryRoot,
  setStatusMsg,
}: UseDataLibraryTreeParams) {
  const [cache, setCache] = useState<Map<string, DataLibraryEntry[]>>(
    () => new Map(),
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [loadingRels, setLoadingRels] = useState<Set<string>>(
    () => new Set(),
  );
  const [rootLoading, setRootLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadDirectory = useCallback(
    async (rel: string) => {
      if (!serviceManager || blocked) return;
      setLoadingRels((r) => new Set(r).add(rel));
      try {
        const list = await listDataLibraryDirectory(
          serviceManager.contents,
          libraryRoot,
          rel,
        );
        setCache((c) => new Map(c).set(rel, list));
      } catch (e) {
        clientError("Could not load folder contents", e);
        setStatusMsg("Could not load folder contents.");
      } finally {
        setLoadingRels((r) => {
          const n = new Set(r);
          n.delete(rel);
          return n;
        });
      }
    },
    [serviceManager, blocked, libraryRoot, setStatusMsg],
  );

  const refreshTree = useCallback(async () => {
    if (!serviceManager || blocked) return;
    setListError(null);
    setRootLoading(true);
    try {
      const rels = new Set<string>(["", ...expanded]);
      const pairs = await Promise.all(
        [...rels].map(async (rel) => {
          const list = await listDataLibraryDirectory(
            serviceManager.contents,
            libraryRoot,
            rel,
          );
          return [rel, list] as const;
        }),
      );
      setCache(new Map(pairs));
      notifyChanged();
    } catch (e) {
      clientError("Could not refresh library", e);
      setListError("Could not refresh library.");
    } finally {
      setRootLoading(false);
    }
  }, [serviceManager, blocked, libraryRoot, expanded]);

  useEffect(() => {
    if (!serviceManager || blocked) return;
    let cancelled = false;
    (async () => {
      setRootLoading(true);
      setListError(null);
      try {
        const list = await listDataLibraryDirectory(
          serviceManager.contents,
          libraryRoot,
          "",
        );
        if (!cancelled) {
          setCache(new Map([["", list]]));
        }
      } catch (e) {
        clientError("Could not load library", e);
        if (!cancelled) setListError("Could not load library.");
      } finally {
        if (!cancelled) setRootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceManager, blocked, libraryRoot]);

  const toggleExpand = useCallback(
    (rel: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(rel)) {
          next.delete(rel);
        } else {
          next.add(rel);
          void loadDirectory(rel);
        }
        return next;
      });
    },
    [loadDirectory],
  );

  const rootEntries = cache.get("") ?? [];

  return {
    cache,
    expanded,
    setExpanded,
    loadingRels,
    rootLoading,
    listError,
    rootEntries,
    loadDirectory,
    refreshTree,
    toggleExpand,
  };
}
