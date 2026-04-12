import { WorkbenchLoadingShell } from "@/components/workbench-loading-shell";

export default function Loading() {
  return (
    <WorkbenchLoadingShell
      asideFullNavRows={2}
      headerTitleWidthClass="w-64"
      headerSubtitleWidthClass="w-96"
    >
      <div className="mx-auto w-full max-w-[1280px] flex-1">
        <div className="mb-3 h-3 w-24 rounded-full bg-foreground/10" />
        <div className="min-h-[min(72vh,840px)] bg-transparent p-0">
          <div className="flex min-h-[280px] items-center justify-center rounded-3xl bg-foreground/5" />
        </div>
      </div>
    </WorkbenchLoadingShell>
  );
}
