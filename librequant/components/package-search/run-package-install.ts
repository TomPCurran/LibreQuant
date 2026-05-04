import type { ServiceManager } from "@jupyterlab/services";

import type { RunNotebookPipInstall } from "@/components/package-search/notebook-pip-types";
import { pipInstallViaEphemeralKernel } from "@/lib/pip-install-via-kernel";

export async function runPackageInstall(
  name: string,
  runNotebookPipInstall: RunNotebookPipInstall | undefined,
  serviceManager: ServiceManager.IManager | null,
): Promise<{ ok: true; text: string } | { ok: false; text: string }> {
  const code = `%pip install ${name}`;

  if (runNotebookPipInstall) {
    const notebookResult = await runNotebookPipInstall(code);
    if (notebookResult !== null) {
      const result = notebookResult;
      if (!result.success) {
        return {
          ok: false,
          text: result.error ?? "Install failed (see kernel output).",
        };
      }
      const errOut = result.outputs?.find((o) => o.type === "error");
      if (errOut && errOut.type === "error") {
        const c = errOut.content as {
          evalue?: string;
          traceback?: string[];
        };
        const text =
          c.evalue?.trim() ||
          c.traceback?.slice(-4).join("\n") ||
          "pip reported an error.";
        return { ok: false, text };
      }
      return {
        ok: true,
        text: `Installed ${name} in the kernel environment.`,
      };
    }
  }

  if (!serviceManager) {
    return {
      ok: false,
      text: runNotebookPipInstall
        ? "Notebook is not ready yet."
        : "Jupyter is not connected.",
    };
  }

  const pipResult = await pipInstallViaEphemeralKernel(serviceManager, name, {
    timeoutMs: 300_000,
  });
  if (!pipResult.ok) {
    return { ok: false, text: pipResult.message };
  }
  return {
    ok: true,
    text: `Installed ${name} in the Jupyter Python environment (same as notebooks).`,
  };
}
