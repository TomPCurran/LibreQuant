import type { Kernel, ServiceManager } from "@jupyterlab/services";
import { KernelMessage } from "@jupyterlab/services";

const DEFAULT_KERNEL_NAME = "python3";

export type PipInstallViaKernelResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Runs `%pip install` on a short-lived Jupyter kernel using the same Python
 * environment as notebook kernels (Docker scipy-notebook image).
 *
 * Used when no notebook adapter is available (e.g. strategy editor only).
 */
export async function pipInstallViaEphemeralKernel(
  serviceManager: ServiceManager.IManager,
  packageName: string,
  options?: { timeoutMs?: number },
): Promise<PipInstallViaKernelResult> {
  const timeoutMs = options?.timeoutMs ?? 300_000;
  await serviceManager.ready;

  const kernel = await serviceManager.kernels.startNew({
    name: DEFAULT_KERNEL_NAME,
  });

  const code = `%pip install ${packageName}`;

  try {
    const result = await runWithTimeout(
      executePipOnKernel(kernel, code),
      timeoutMs,
      "Package install timed out.",
    );
    return result;
  } finally {
    try {
      await kernel.shutdown();
    } catch {
      /* kernel may already be shutting down */
    }
  }
}

async function executePipOnKernel(
  kernel: Kernel.IKernelConnection,
  code: string,
): Promise<PipInstallViaKernelResult> {
  /** Ref object so TS tracks mutations across `await` (callbacks are not control-flow analyzed). */
  const iopubError: { current: KernelMessage.IErrorMsg["content"] | null } = {
    current: null,
  };

  const future = kernel.requestExecute(
    {
      code,
      silent: false,
      store_history: false,
      allow_stdin: false,
    },
    true,
  );

  future.onIOPub = (msg) => {
    if (KernelMessage.isErrorMsg(msg)) {
      iopubError.current = msg.content;
    }
  };

  let reply: KernelMessage.IExecuteReplyMsg;
  try {
    reply = await future.done;
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Kernel execution failed unexpectedly.",
    };
  }

  const { content } = reply;
  if (content.status === "error") {
    const c = content as KernelMessage.IReplyErrorContent;
    return {
      ok: false,
      message:
        c.evalue?.trim() ||
        c.traceback?.slice(-4).join("\n") ||
        "pip reported an error.",
    };
  }

  const errOut = iopubError.current;
  if (errOut) {
    return {
      ok: false,
      message:
        errOut.evalue?.trim() ||
        errOut.traceback?.slice(-4).join("\n") ||
        "pip reported an error.",
    };
  }

  return { ok: true };
}

function runWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise
      .then((v) => {
        window.clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        window.clearTimeout(t);
        reject(e);
      });
  });
}
