/**
 * Browser CustomEvents so hooks can react when the kernel is restarted explicitly
 * (e.g. “Reset session”). `@datalayer/jupyter-react` may not surface a reliable
 * `"restarting"` status for every restart, so we broadcast from
 * {@link notebookClearOutputsAndRestartKernel}.
 */

export const LIBREQUANT_KERNEL_RESTARTING = "librequant-kernel-restarting";
export const LIBREQUANT_KERNEL_RESTARTED = "librequant-kernel-restarted";

/** Dispatched after a new strategy directory is created via the Contents API (e.g. strategy editor). */
export const LIBREQUANT_STRATEGY_CREATED = "librequant-strategy-created";

export type LibreQuantKernelLifecycleDetail = {
  notebookId: string;
};

export type LibreQuantStrategyCreatedDetail = {
  dirPath: string;
};
