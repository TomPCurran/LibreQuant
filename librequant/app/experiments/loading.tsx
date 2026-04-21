import { WorkbenchShell } from "@/components/workbench-shell";

export default function ExperimentsLoading() {
  return (
    <WorkbenchShell
      sectionEyebrow="MLflow"
      title="Experiments"
      subtitle="Loading…"
    >
      <div
        className="h-64 animate-pulse rounded-lg bg-foreground/5"
        aria-hidden
      />
    </WorkbenchShell>
  );
}
