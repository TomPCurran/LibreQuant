/**
 * Browser CustomEvents so hooks can react when the kernel is restarted explicitly
 * (e.g. “Reset session”). `@datalayer/jupyter-react` may not surface a reliable
 * `"restarting"` status for every restart, so we broadcast from
 * {@link notebookClearOutputsAndRestartKernel}.
 */

export const LIBREQUANT_KERNEL_RESTARTING = "librequant-kernel-restarting";
export const LIBREQUANT_KERNEL_RESTARTED = "librequant-kernel-restarted";

export type LibreQuantKernelLifecycleDetail = {
  notebookId: string;
};
