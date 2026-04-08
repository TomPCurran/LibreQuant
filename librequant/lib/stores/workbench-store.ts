import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkbenchState = {
  sidebarOpen: boolean;
  activeNotebookPath: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveNotebookPath: (path: string | null) => void;
};

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      activeNotebookPath: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setActiveNotebookPath: (path) => set({ activeNotebookPath: path }),
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
