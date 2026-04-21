"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { experimentsPageHref } from "@/lib/experiments/experiments-url";
import { getPublicMlflowUiUrl } from "@/lib/env";
import { useMlflowExperimentsList } from "@/lib/mlflow-experiments-list";
import { useExperimentExplorerStore } from "@/lib/stores/experiment-explorer-store";

/**
 * MLflow-focused sidebar (full Experiments page remains under the top nav “Experiments”).
 */
export function SidebarExperiments() {
  const pathname = usePathname();
  const [sectionOpen, setSectionOpen] = useState(true);
  const mlflowUi = getPublicMlflowUiUrl();
  const isExperimentsActive = pathname === "/experiments";

  const { experiments, listError, loadingExperiments: listLoading } =
    useMlflowExperimentsList();

  const selectedExperimentName = useExperimentExplorerStore(
    (s) => s.selectedExperimentName,
  );

  const sortedExperiments = useMemo(() => {
    const list = [...experiments];
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [experiments]);

  const experimentsRootHref = experimentsPageHref(selectedExperimentName);

  const toggleSection = () => setSectionOpen((v) => !v);

  return (
    <div className="mt-3 flex flex-col">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSection}
          className="flex shrink-0 items-center justify-center rounded p-0.5 text-text-secondary transition hover:text-text-primary"
          aria-label={sectionOpen ? "Collapse MLflow section" : "Expand MLflow section"}
        >
          {sectionOpen ? (
            <ChevronDown className="size-3" aria-hidden />
          ) : (
            <ChevronRight className="size-3" aria-hidden />
          )}
        </button>
        <Link
          href={experimentsRootHref}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:bg-foreground/5 ${
            isExperimentsActive
              ? "text-alpha"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          MLflow
        </Link>
      </div>

      {sectionOpen ? (
        <div className="ml-1.5 flex flex-col gap-2 border-l border-foreground/8 pl-1 pt-0.5">
          <Link
            href={experimentsRootHref}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] transition hover:bg-foreground/5 ${
              isExperimentsActive
                ? "bg-alpha/10 text-alpha"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <LayoutGrid className="size-3 shrink-0" aria-hidden />
            <span className="font-medium">Explorer</span>
          </Link>

          <div className="px-1">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
              <FlaskConical className="size-3 text-alpha/80" aria-hidden />
              MLflow experiments
            </p>
            <div className="max-h-[132px] overflow-hidden rounded-md border border-foreground/10 bg-foreground/2 shadow-sm dark:bg-foreground/5">
              {listLoading ? (
                <div className="flex items-center justify-center gap-1.5 py-6 text-[10px] text-text-secondary">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : listError ? (
                <p className="px-2 py-3 text-[10px] leading-snug text-text-secondary">
                  {listError}
                </p>
              ) : sortedExperiments.length === 0 ? (
                <p className="px-2 py-3 text-[10px] leading-snug text-text-secondary">
                  No experiments yet. Log runs from a notebook to see them here.
                </p>
              ) : (
                <ul
                  className="max-h-[132px] overflow-y-auto py-0.5"
                  aria-label="MLflow experiments"
                >
                  {sortedExperiments.map((exp) => {
                    const selected =
                      isExperimentsActive &&
                      selectedExperimentName === exp.name;
                    return (
                      <li key={exp.experimentId}>
                        <Link
                          href={experimentsPageHref(exp.name)}
                          title={exp.name}
                          className={`block truncate px-2 py-1 text-[11px] transition hover:bg-foreground/8 ${
                            selected
                              ? "bg-alpha/10 font-medium text-alpha"
                              : "text-text-primary"
                          }`}
                        >
                          {exp.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="mt-1 px-0.5 text-[10px] leading-snug text-text-secondary">
              Click a name to open Explorer with that experiment selected.
            </p>
            <a
              href={mlflowUi}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1 rounded-md px-1 py-1 text-[11px] text-alpha transition hover:bg-foreground/5 hover:underline"
            >
              <ExternalLink className="size-3 shrink-0" aria-hidden />
              Open MLflow UI
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
