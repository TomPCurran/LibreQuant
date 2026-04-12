import { WorkbenchLoadingShell } from "@/components/workbench-loading-shell";

export default function StrategyEditorLoading() {
  return (
    <WorkbenchLoadingShell
      headerTitleWidthClass="w-40"
      headerSubtitleWidthClass="w-72"
    >
      <div className="mx-auto w-full max-w-5xl flex-1">
        <div className="mb-3 h-3 w-24 rounded-full bg-foreground/10" />
        <div className="flex gap-3">
          <div className="flex min-h-[400px] overflow-hidden rounded-xl border border-foreground/8">
            <div className="w-48 shrink-0 bg-foreground/3" />
            <div className="min-w-[600px] flex-1 bg-foreground/5" />
          </div>
        </div>
      </div>
    </WorkbenchLoadingShell>
  );
}
