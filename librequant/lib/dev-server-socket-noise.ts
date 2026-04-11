/**
 * Marks common dev-only socket teardown errors as handled so they are less likely to
 * surface as fatal `uncaughtException` / `unhandledRejection` noise from the Next.js process.
 *
 * Does not remove all terminal output (Next may still log once); see README troubleshooting.
 */

function isBenignDevSocketError(reason: unknown): boolean {
  if (reason == null || typeof reason !== "object") return false;
  const e = reason as NodeJS.ErrnoException;
  if (e.code === "ECONNRESET" || e.code === "EPIPE" || e.code === "ECONNABORTED") {
    return true;
  }
  if (typeof e.message === "string" && /socket hang up/i.test(e.message)) {
    return true;
  }
  return false;
}

export function installDevServerSocketNoiseHandlers(): void {
  if (process.env.NODE_ENV === "production") return;

  process.prependListener("unhandledRejection", (reason) => {
    if (!isBenignDevSocketError(reason)) return;
    // Consider handled — avoids Node treating this as an unhandled rejection in some paths.
  });

  process.prependListener("uncaughtException", (err) => {
    if (!isBenignDevSocketError(err)) return;
    // Same for sync throws; Next may still print — see README.
  });
}
