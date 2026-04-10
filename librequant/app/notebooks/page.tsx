import type { Metadata } from "next";
import { WorkbenchShell } from "@/components/workbench-shell";
import { NotebookLibraryPanel } from "@/components/notebooks/notebook-library-panel";

export const metadata: Metadata = {
  title: "Notebooks | LibreQuant Nexus",
  description:
    "Create, upload, and open Jupyter notebooks stored in your local workspace.",
};

export default function NotebooksPage() {
  return (
    <WorkbenchShell
      sectionEyebrow="Notebook library"
      title="Notebooks"
      subtitle="Create, upload, and open notebooks stored in your local Jupyter workspace."
    >
      <NotebookLibraryPanel />
    </WorkbenchShell>
  );
}
