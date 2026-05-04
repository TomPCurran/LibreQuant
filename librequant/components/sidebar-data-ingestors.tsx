"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import { SidebarDataKeysSection } from "@/components/data-ingestors/sidebar-data-keys-section";
import { SidebarDatabasesSection } from "@/components/data-ingestors/sidebar-databases-section";
import { SidebarDataUploadsSection } from "@/components/data-ingestors/sidebar-data-uploads-section";
import { useDataIngestors } from "@/components/data-ingestors/use-data-ingestors";

export function SidebarDataIngestors() {
  const {
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
  } = useDataIngestors();

  const toggleSection = () => setSectionOpen((v) => !v);

  return (
    <div className="mt-3 flex flex-col">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSection}
          className="flex shrink-0 items-center justify-center rounded p-0.5 text-text-secondary transition hover:text-text-primary"
          aria-label={
            sectionOpen ? "Collapse data and keys section" : "Expand data and keys section"
          }
        >
          {sectionOpen ? (
            <ChevronDown className="size-3" aria-hidden />
          ) : (
            <ChevronRight className="size-3" aria-hidden />
          )}
        </button>
        <Link
          href="/data-sources"
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:bg-foreground/5 ${
            isDataSourcesActive
              ? "text-alpha"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Data & keys
        </Link>
      </div>

      {sectionOpen ? (
        <div className="ml-1.5 flex flex-col border-l border-foreground/8 pl-1">
          <SidebarDataKeysSection
            activeKeysOpen={activeKeysOpen}
            onToggleOpen={() => setActiveKeysOpen((v) => !v)}
            statusLoading={statusLoading}
            activeKeyRows={activeKeyRows}
          />

          <SidebarDatabasesSection
            databasesOpen={databasesOpen}
            onToggleOpen={() => setDatabasesOpen((v) => !v)}
            statusLoading={statusLoading}
            databaseRows={databaseRows}
          />

          <SidebarDataUploadsSection
            dataFolderOpen={dataFolderOpen}
            onToggleDataFolder={() => setDataFolderOpen((v) => !v)}
            uploadsFolderOpen={uploadsFolderOpen}
            onToggleUploadsFolder={() => setUploadsFolderOpen((v) => !v)}
            uploadsBlocked={uploadsBlocked}
            treeListLoading={treeListLoading}
            treeListError={treeListError}
            rootItems={rootItems}
            rootItemCount={rootItemCount}
            treeCache={treeCache}
            treeExpanded={treeExpanded}
            treeLoadingRels={treeLoadingRels}
            onRefreshUploadsTree={refreshUploadsTree}
            onToggleTreeFolder={toggleTreeFolder}
          />
        </div>
      ) : null}
    </div>
  );
}
