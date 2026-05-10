"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useJupyterReachability } from "@/lib/jupyter-reachability-context";
import { useJupyterServiceManager } from "@/lib/use-jupyter-service-manager";
import { useHasMounted } from "@/lib/use-has-mounted";
import { DATA_SOURCES_CHANGED_EVENT } from "@/lib/data-sources/constants";
import {
  isUserDatabaseUrlKey,
  slugFromUserDatabaseUrlKey,
  type ManagedSecretKey,
} from "@/lib/data-sources/custom-env-key";
import { useDataSourcesStatusOptional } from "@/lib/data-sources-status-context";
import { getNotebookLibraryRoot } from "@/lib/env";
import {
  listDataLibraryDirectory,
  type DataLibraryEntry,
} from "@/lib/jupyter-contents";

type CredentialsPresence = Record<ManagedSecretKey, boolean>;

const EMPTY_CREDENTIALS_PRESENCE: CredentialsPresence = {
  ALPACA_API_KEY: false,
  ALPACA_SECRET_KEY: false,
  POLYGON_API_KEY: false,
  TIINGO_API_KEY: false,
};

export function useDataIngestors() {
  const pathname = usePathname();
  const dataSourcesStatus = useDataSourcesStatusOptional();
  const { reachable } = useJupyterReachability();
  const { serviceManager, error: smError } = useJupyterServiceManager();
  const hasMounted = useHasMounted();
  const [sectionOpen, setSectionOpen] = useState(true);
  const [activeKeysOpen, setActiveKeysOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(
    () => dataSourcesStatus == null,
  );
  const [fallbackPresence, setFallbackPresence] =
    useState<CredentialsPresence>(EMPTY_CREDENTIALS_PRESENCE);
  const [fallbackCustomKeys, setFallbackCustomKeys] = useState<string[]>([]);

  const presence =
    dataSourcesStatus?.snapshot.credentialsPresent ?? fallbackPresence;
  const customEnvKeys =
    dataSourcesStatus?.snapshot.customEnvKeys ?? fallbackCustomKeys;
  const [databasesOpen, setDatabasesOpen] = useState(true);
  const [dataFolderOpen, setDataFolderOpen] = useState(true);
  const [uploadsFolderOpen, setUploadsFolderOpen] = useState(true);

  const [treeCache, setTreeCache] = useState<Map<string, DataLibraryEntry[]>>(
    () => new Map(),
  );
  const [treeExpanded, setTreeExpanded] = useState<Set<string>>(
    () => new Set(),
  );
  const [treeLoadingRels, setTreeLoadingRels] = useState<Set<string>>(
    () => new Set(),
  );
  const [treeListLoading, setTreeListLoading] = useState(false);
  const [treeListError, setTreeListError] = useState<string | null>(null);

  const uploadsBlocked =
    !hasMounted || !reachable || !serviceManager || Boolean(smError);
  const libraryRoot = getNotebookLibraryRoot();

  const alpacaComplete =
    Boolean(presence.ALPACA_API_KEY) && Boolean(presence.ALPACA_SECRET_KEY);
  const userDatabaseUrlKeys = useMemo(
    () => customEnvKeys.filter((k) => isUserDatabaseUrlKey(k)).sort(),
    [customEnvKeys],
  );
  const genericCustomKeys = useMemo(
    () => customEnvKeys.filter((k) => !isUserDatabaseUrlKey(k)),
    [customEnvKeys],
  );
  const customCount = genericCustomKeys.length;

  const databaseRows = useMemo(() => {
    const rows: { id: string; label: string }[] = [
      { id: "pg-docker-default", label: "PostgreSQL (Docker default)" },
    ];
    for (const k of userDatabaseUrlKeys) {
      rows.push({
        id: k,
        label: slugFromUserDatabaseUrlKey(k) ?? k,
      });
    }
    return rows;
  }, [userDatabaseUrlKeys]);

  const activeKeyRows = useMemo(() => {
    const rows: { id: string; label: string; count?: number }[] = [
      { id: "yfinance", label: "yfinance" },
    ];
    if (alpacaComplete) rows.push({ id: "alpaca", label: "Alpaca" });
    if (presence.POLYGON_API_KEY) {
      rows.push({ id: "polygon", label: "Polygon (reserved)" });
    }
    if (presence.TIINGO_API_KEY) {
      rows.push({ id: "tiingo", label: "Tiingo (reserved)" });
    }
    if (customCount > 0) {
      rows.push({ id: "custom", label: "Custom", count: customCount });
    }
    return rows;
  }, [
    alpacaComplete,
    presence.POLYGON_API_KEY,
    presence.TIINGO_API_KEY,
    customCount,
  ]);

  const rootItems = treeCache.get("") ?? [];
  const rootItemCount = rootItems.length;

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/data-sources/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        credentialsPresent: CredentialsPresence;
        customEnvKeys: string[];
      };
      setFallbackPresence(data.credentialsPresent);
      setFallbackCustomKeys(data.customEnvKeys);
    } catch {
      /* non-critical */
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadDir = useCallback(
    async (rel: string) => {
      if (!serviceManager || uploadsBlocked) return;
      setTreeLoadingRels((r) => new Set(r).add(rel));
      try {
        const list = await listDataLibraryDirectory(
          serviceManager.contents,
          libraryRoot,
          rel,
        );
        setTreeCache((c) => new Map(c).set(rel, list));
        setTreeListError(null);
      } catch (err) {
        console.error(err);
        setTreeListError("List failed");
      } finally {
        setTreeLoadingRels((r) => {
          const n = new Set(r);
          n.delete(rel);
          return n;
        });
      }
    },
    [serviceManager, uploadsBlocked, libraryRoot],
  );

  const refreshUploadsTree = useCallback(async () => {
    if (!serviceManager || uploadsBlocked) return;
    setTreeListLoading(true);
    setTreeListError(null);
    try {
      const rels = new Set<string>(["", ...treeExpanded]);
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
      setTreeCache(new Map(pairs));
    } catch (err) {
      console.error(err);
      setTreeListError("List failed");
      setTreeCache(new Map());
    } finally {
      setTreeListLoading(false);
    }
  }, [serviceManager, uploadsBlocked, libraryRoot, treeExpanded]);

  const toggleTreeFolder = useCallback(
    (rel: string) => {
      setTreeExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(rel)) {
          next.delete(rel);
        } else {
          next.add(rel);
          void loadDir(rel);
        }
        return next;
      });
    },
    [loadDir],
  );

  useEffect(() => {
    if (dataSourcesStatus) {
      setStatusLoading(false);
      return;
    }
    void refreshStatus();
  }, [dataSourcesStatus, refreshStatus]);

  useEffect(() => {
    if (uploadsBlocked) return;
    void loadDir("");
  }, [uploadsBlocked, loadDir]);

  useEffect(() => {
    const onChanged = () => {
      if (!dataSourcesStatus) void refreshStatus();
      void refreshUploadsTree();
    };
    window.addEventListener(DATA_SOURCES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DATA_SOURCES_CHANGED_EVENT, onChanged);
  }, [dataSourcesStatus, refreshStatus, refreshUploadsTree]);

  const isDataSourcesActive = pathname === "/data-sources";

  return {
    sectionOpen,
    setSectionOpen,
    activeKeysOpen,
    setActiveKeysOpen,
    statusLoading,
    activeKeyRows,
    databasesOpen,
    setDatabasesOpen,
    databaseRows,
    dataFolderOpen,
    setDataFolderOpen,
    uploadsFolderOpen,
    setUploadsFolderOpen,
    uploadsBlocked,
    treeCache,
    treeExpanded,
    treeLoadingRels,
    treeListLoading,
    treeListError,
    rootItems,
    rootItemCount,
    refreshUploadsTree,
    toggleTreeFolder,
    isDataSourcesActive,
  };
}
