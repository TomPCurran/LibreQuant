import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkbenchState = {
  sidebarOpen: boolean;
  activeNotebookPath: string | null;
  /** PyPI install modal — not persisted */
  packageSearchOpen: boolean;
  /** Bumps when the modal opens so the search panel remounts with fresh state */
  packageSearchGeneration: number;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveNotebookPath: (path: string | null) => void;
  setPackageSearchOpen: (open: boolean) => void;
};

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      activeNotebookPath: null,
      packageSearchOpen: false,
      packageSearchGeneration: 0,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setActiveNotebookPath: (path) => set({ activeNotebookPath: path }),
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
