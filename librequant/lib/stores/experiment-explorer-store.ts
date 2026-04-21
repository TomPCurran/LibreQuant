import { create } from "zustand";

export type ExperimentSortColumn =
  | "startTime"
  | "symbol"
  | "dateRange"
  | "sharpe"
  | "maxDrawdown"
  | "cagr"
  | "status";

type SortDir = "asc" | "desc";

export type ExperimentExplorerState = {
  selectedExperimentName: string | null;
  /** Up to two run ids for PARAMS diff. */
  selectedRunIds: string[];
  expandedRunId: string | null;
  sortColumn: ExperimentSortColumn;
  sortDir: SortDir;
  setSelectedExperimentName: (name: string | null) => void;
  toggleRunSelection: (runId: string) => void;
  clearRunSelection: () => void;
  setExpandedRunId: (id: string | null) => void;
  setSort: (column: ExperimentSortColumn) => void;
};

export const useExperimentExplorerStore = create<ExperimentExplorerState>(
  (set, get) => ({
    selectedExperimentName: null,
    selectedRunIds: [],
    expandedRunId: null,
    sortColumn: "startTime",
    sortDir: "desc",
    setSelectedExperimentName: (name) =>
      set({
        selectedExperimentName: name,
        selectedRunIds: [],
        expandedRunId: null,
      }),
    toggleRunSelection: (runId) =>
      set((s) => {
        const cur = s.selectedRunIds;
        if (cur.includes(runId)) {
          return { selectedRunIds: cur.filter((id) => id !== runId) };
        }
        if (cur.length >= 2) {
          return { selectedRunIds: [cur[1]!, runId] };
        }
        return { selectedRunIds: [...cur, runId] };
      }),
    clearRunSelection: () => set({ selectedRunIds: [] }),
    setExpandedRunId: (id) => set({ expandedRunId: id }),
    setSort: (column) => {
      const { sortColumn, sortDir } = get();
      if (sortColumn === column) {
        set({ sortDir: sortDir === "asc" ? "desc" : "asc" });
      } else {
        set({ sortColumn: column, sortDir: column === "startTime" ? "desc" : "asc" });
      }
    },
  }),
);
