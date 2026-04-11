import type { Metadata } from "next";
import { WorkbenchShell } from "@/components/workbench-shell";
import { StrategyLibraryPanel } from "@/components/strategies/strategy-library-panel";

export const metadata: Metadata = {
  title: "Strategies | LibreQuant Nexus",
  description:
    "Create, edit, and manage Python strategy modules stored in your local workspace.",
};

export default function StrategiesPage() {
  return (
    <WorkbenchShell
      sectionEyebrow="Strategy library"
      title="Strategies"
      subtitle="Create and manage Python strategy modules in your local Jupyter workspace."
    >
      <StrategyLibraryPanel />
    </WorkbenchShell>
  );
}
