"use client";

import type { Contents } from "@jupyterlab/services";
import { createContext, useContext } from "react";

export type NotebookWorkbenchContextValue = {
  notebookServerPath: string;
  contents: Contents.IManager;
  onRenamed: (newPath: string) => void;
};

const NotebookWorkbenchContext =
  createContext<NotebookWorkbenchContextValue | null>(null);

export function NotebookWorkbenchProvider({
  value,
  children,
}: {
  value: NotebookWorkbenchContextValue;
  children: React.ReactNode;
}) {
  return (
    <NotebookWorkbenchContext.Provider value={value}>
      {children}
    </NotebookWorkbenchContext.Provider>
  );
}

export function useNotebookWorkbench(): NotebookWorkbenchContextValue | null {
  return useContext(NotebookWorkbenchContext);
}
