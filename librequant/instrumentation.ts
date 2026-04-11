/**
 * Next.js instrumentation hook (optional). Keep minimal so dev does not depend on a missing file
 * after cache churn — see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * `register` is bundled for Edge and Node. Node-only APIs (e.g. `process.prependListener`) must be
 * loaded via dynamic `import()` only when `NEXT_RUNTIME === 'nodejs'` — see Next.js docs.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installDevServerSocketNoiseHandlers } = await import(
      "./lib/dev-server-socket-noise"
    );
    installDevServerSocketNoiseHandlers();
  }
}
