/**
 * @module kernel-lifecycle-events
 *
 * Browser `CustomEvent` names and payload types for cross-hook coordination:
 *
 * - **Kernel lifecycle** — emitted by {@link notebookClearOutputsAndRestartKernel} so
 *   `useStrategyPathInjection` and similar logic avoid racing `executeCode` during restart.
 * - **Strategy creation** — emitted after `createStrategyDirectory` in `strategy-contents.ts` so the notebook
 *   workbench can refresh `__init__.py` hygiene via the Contents API without restarting the kernel.
 *
 * `@datalayer/jupyter-react` may not surface a reliable `"restarting"` status for every restart,
 * so kernel events are dispatched explicitly from {@link notebookClearOutputsAndRestartKernel}.
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
