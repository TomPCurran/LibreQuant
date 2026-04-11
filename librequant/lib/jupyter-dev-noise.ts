/**
 * JupyterLab 4 always uses Yjs for the notebook model; @datalayer/jupyter-react also wires
 * Codemirror + kernel comms. In Next dev (HMR, fast refresh), you still see benign Yjs
 * warnings, LabIcon SVG asset warnings, and occasional "Comm not found" / "Disposed"
 * rejections when a comm closes before a message is handled.
 *
 * This module only runs in development and only while the notebook subtree is mounted.
 * Set NEXT_PUBLIC_JUPYTER_VERBOSE=1 to disable filtering and see full logs.
 */

function shouldSuppressConsoleArgs(args: unknown[]): boolean {
  const s = args
    .map((a) =>
      typeof a === "string"
        ? a
        : a instanceof Error
          ? a.message
          : String(a ?? ""),
    )
    .join(" ");
  return (
    s.includes("Invalid access") ||
    s.includes("Not same Y.Doc") ||
    s.includes("[yjs#") ||
    s.includes("Comm not found") ||
    s.includes("SVG HTML was malformed for LabIcon") ||
    s.includes("[JupyterLabCss]") ||
    s.includes("Requesting cell execution without any cell executor") ||
    s.includes("model is null") ||
    s.includes("cell.model") ||
    s.includes('can\'t access property "id"') ||
    s.includes("Cell execution timed out") ||
    s.includes("Execution timeout") ||
    s.includes("Failed to interrupt kernel")
  );
}

function shouldSuppressRejection(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? "");
  return (
    msg === "Disposed" ||
    msg.includes("Comm not found") ||
    msg.includes("model is null") ||
    msg.includes("cell.model") ||
    msg.includes('can\'t access property "id"') ||
    msg.includes("Execution timeout")
  );
}

export function installJupyterDevNoiseSuppression(): () => void {
  if (process.env.NODE_ENV !== "development") {
    return () => {};
  }
  if (process.env.NEXT_PUBLIC_JUPYTER_VERBOSE === "1") {
    return () => {};
  }

  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = (...args: unknown[]) => {
    if (shouldSuppressConsoleArgs(args)) return;
    origLog(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (shouldSuppressConsoleArgs(args)) return;
    origWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    if (shouldSuppressConsoleArgs(args)) return;
    origError(...args);
  };

  const onRejection = (e: PromiseRejectionEvent) => {
    if (shouldSuppressRejection(e.reason)) {
      e.preventDefault();
    }
  };
  const onWindowError = (e: ErrorEvent) => {
    const msg =
      e.message ??
      (e.error instanceof Error ? e.error.message : String(e.error ?? ""));
    if (
      msg.includes("model is null") ||
      msg.includes("cell.model") ||
      msg.includes('can\'t access property "id"')
    ) {
      e.preventDefault();
    }
  };
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("error", onWindowError);

  return () => {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("error", onWindowError);
  };
}

let installedCleanup: (() => void) | null = null;

/**
 * Idempotent: call from render before the notebook subtree mounts so Yjs / JupyterLab
 * cannot emit to the console before a useEffect would patch it (Next forwards those as [browser]).
 */
export function ensureJupyterDevNoiseInstalledBeforeNotebook(): void {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.NEXT_PUBLIC_JUPYTER_VERBOSE === "1") return;
  if (typeof window === "undefined") return;
  if (installedCleanup) return;
  installedCleanup = installJupyterDevNoiseSuppression();
}

export function teardownJupyterDevNoiseFromWorkbench(): void {
  installedCleanup?.();
  installedCleanup = null;
}
