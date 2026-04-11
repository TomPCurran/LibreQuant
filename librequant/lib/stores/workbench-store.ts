import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Set by {@link useStrategyPathInjection} via the notebook workbench — not persisted */
export type StrategyPathStatus = "pending" | "ready" | "failed";

export type WorkbenchState = {
  sidebarOpen: boolean;
  activeNotebookPath: string | null;
  /** Matches `@datalayer/jupyter-react` `Notebook` `id` for the open file — not persisted */
  activeNotebookId: string | null;
  /** Strategies `sys.path` injection — not persisted */
  strategyPathStatus: StrategyPathStatus;
  /** PyPI install modal — not persisted */
  packageSearchOpen: boolean;
  /** Bumps when the modal opens so the search panel remounts with fresh state */
  packageSearchGeneration: number;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveNotebookPath: (path: string | null) => void;
  setActiveNotebookId: (id: string | null) => void;
  setStrategyPathStatus: (status: StrategyPathStatus) => void;
  setPackageSearchOpen: (open: boolean) => void;
};

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      activeNotebookPath: null,
      activeNotebookId: null,
      strategyPathStatus: "pending",
      packageSearchOpen: false,
      packageSearchGeneration: 0,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setActiveNotebookPath: (path) => set({ activeNotebookPath: path }),
      setActiveNotebookId: (id) => set({ activeNotebookId: id }),
      setStrategyPathStatus: (strategyPathStatus) => set({ strategyPathStatus }),
      setPackageSearchOpen: (open) =>
        set((state) => ({
          packageSearchOpen: open,
          packageSearchGeneration: open
            ? state.packageSearchGeneration + 1
            : state.packageSearchGeneration,
        })),
    }),
    {
      name: "librequant-workbench",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activeNotebookPath: state.activeNotebookPath,
      }),
    }
  )
);
