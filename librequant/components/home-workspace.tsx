"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkbenchShell } from "@/components/workbench-shell";
import { useJupyterReachability } from "@/lib/jupyter-reachability-context";
import {
  HOME_NOTEBOOK_BUNDLE_LOADING,
  HOME_WORKSPACE_SHELL_LOADING,
  NOTEBOOK_PHASE_TITLE,
} from "@/lib/jupyter-notebook-phase";

const JupyterWorkbench = dynamic(
  () =>
    import("@/lib/ensure-webpack-public-path")
      .then(() => import("@/components/notebook/jupyter-workbench"))
      .then((m) => m.JupyterWorkbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm font-light leading-relaxed text-text-secondary">
        {HOME_NOTEBOOK_BUNDLE_LOADING}
      </div>
    ),
  },
);

export function HomeWorkspace() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path") ?? "";
  /** Full remount when `?path=` changes so Jupyter/Yjs does not reuse disposed cell models */
  const workbenchKey = path || "no-notebook";
  const { probeComplete, reachable } = useJupyterReachability();

  if (!probeComplete) {
    return (
      <WorkbenchShell>
        <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm font-light leading-relaxed text-text-secondary">
          {NOTEBOOK_PHASE_TITLE.connecting_jupyter}…
        </div>
      </WorkbenchShell>
    );
  }

  if (!reachable) {
    return (
      <WorkbenchShell>
        <div
          className="mx-auto max-w-xl px-6 py-12 text-center text-sm font-light leading-relaxed text-text-secondary"
          role="status"
        >
          Jupyter server is not reachable. When it is running, reload this page. If you use a
          custom token, ensure <code className="font-mono-code text-[12px]">NEXT_PUBLIC_JUPYTER_TOKEN</code>{" "}
          matches the server.
        </div>
      </WorkbenchShell>
    );
  }

  return (
    <WorkbenchShell>
      <Suspense
        fallback={
          <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm font-light text-text-secondary">
            {HOME_WORKSPACE_SHELL_LOADING}
          </div>
        }
      >
        <JupyterWorkbench key={workbenchKey} />
      </Suspense>
    </WorkbenchShell>
  );
}
