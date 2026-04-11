"use client";

import type { Kernel as JupyterKernel } from "@jupyterlab/services";

type Props = {
  status: JupyterKernel.ConnectionStatus | null;
};

/**
 * Non-blocking notice when the kernel WebSocket is not fully connected.
 */
export function JupyterTransportBanner({ status }: Props) {
  if (status == null || status === "connected") {
    return null;
  }

  const text =
    status === "connecting"
      ? "Jupyter connection: reconnecting — running cells may be delayed until the channel is ready."
      : "Jupyter connection: disconnected from the kernel channel. Try again in a moment or reload if this persists.";

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-light leading-snug text-text-primary dark:border-amber-400/30 dark:bg-amber-400/10"
    >
      {text}
    </div>
  );
}
