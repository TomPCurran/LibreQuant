import type { Metadata } from "next";
import { Suspense } from "react";

import { ExperimentExplorer } from "@/components/experiments/experiment-explorer";
import { WorkbenchShell } from "@/components/workbench-shell";

export const metadata: Metadata = {
  title: "Experiments | LibreQuant",
  description:
    "Browse MLflow runs and parameters for strategies tracked from notebooks.",
};

export default function ExperimentsPage() {
  return (
    <WorkbenchShell
      sectionEyebrow="MLflow"
      title="Experiments"
      subtitle="Explore runs per strategy (experiment), compare params, and review logged artifacts."
    >
      <Suspense
        fallback={
          <p className="text-sm text-text-secondary">Loading experiments…</p>
        }
      >
        <ExperimentExplorer />
      </Suspense>
    </WorkbenchShell>
  );
}
