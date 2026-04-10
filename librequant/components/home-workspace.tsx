"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkbenchShell } from "@/components/workbench-shell";

const JupyterWorkbench = dynamic(
  () =>
    import("@/lib/ensure-webpack-public-path")
      .then(() => import("@/components/notebook/jupyter-workbench"))
      .then((m) => m.JupyterWorkbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm font-light text-text-secondary">
        Loading notebook runtime…
      </div>
    ),
  },
);

export function HomeWorkspace() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path") ?? "";
  /** Full remount when `?path=` changes so Jupyter/Yjs does not reuse disposed cell models */
  const workbenchKey = path || "no-notebook";

  return (
    <WorkbenchShell>
      <Suspense
        fallback={
          <div className="flex min-h-[320px] items-center justify-center text-sm font-light text-text-secondary">
            Loading workspace…
          </div>
        }
      >
        <JupyterWorkbench key={workbenchKey} />
      </Suspense>
    </WorkbenchShell>
  );
}
