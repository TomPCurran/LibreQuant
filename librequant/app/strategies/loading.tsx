import { WorkbenchLoadingShell } from "@/components/workbench-loading-shell";

export default function StrategiesLoading() {
  return (
    <WorkbenchLoadingShell
      headerTitleWidthClass="w-48"
      headerSubtitleWidthClass="w-80"
    >
      <div className="mx-auto w-full max-w-5xl flex-1">
        <div className="mb-3 h-3 w-28 rounded-full bg-foreground/10" />
        <div className="flex flex-col gap-3">
          <div className="h-16 rounded-3xl bg-foreground/5" />
          <div className="h-16 rounded-3xl bg-foreground/5" />
          <div className="h-16 rounded-3xl bg-foreground/5" />
        </div>
      </div>
    </WorkbenchLoadingShell>
  );
}
