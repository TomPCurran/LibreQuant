import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { installDevServerSocketNoiseHandlers } from "./lib/dev-server-socket-noise";
import { publicEnv } from "./lib/env";

/** Node-only (config load). Avoid `instrumentation.ts`, which is also bundled for Edge and flags `process.prependListener`. */
if (process.env.NODE_ENV === "development") {
  installDevServerSocketNoiseHandlers();
}

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** Force Tailwind resolution into this package's node_modules when a parent dir (or ~/package.json workspaces) confuses the resolver. */
function nm(pkg: string): string {
  return path.join(appDir, "node_modules", pkg);
}

const jupyterOrigin = publicEnv.jupyterBaseUrlNormalized;
const jupyterWs = jupyterOrigin.replace(/^http/, "ws");

const mlflowUiOrigin = publicEnv.mlflowUiUrlNormalized;

// Allow the browser to reach Jupyter (HTTP + WS) in dev and production. Without the Jupyter
// origin here, `next start` + local Docker Jupyter fails: CSP blocks fetch() to /api/kernels.
const connectSrc = `'self' ${jupyterOrigin} ${jupyterWs} ws: wss:`;

/** JupyterLab / @datalayer may load AMD `require` from cdnjs for notebook widgets — blocked if omitted. */
const scriptSrcExtra = " https://cdnjs.cloudflare.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'${scriptSrcExtra}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  `frame-src 'self' ${mlflowUiOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Avoid experimental.optimizePackageImports for lucide-react here: on Next 16 + Turbopack
  // it has been associated with odd runtime issues; tree-shaking still applies via named imports.
  // JupyterLab / @datalayer/jupyter-react rely on Yjs + kernel comms; React Strict Mode's
  // dev-only double mount disposes models while globals still reference the old Y.Doc,
  // which spams Yjs errors, "Disposed" rejections, and "Comm not found" noise.
  reactStrictMode: false,
  // Lock workspace to this app so Turbopack does not pick a parent lockfile (e.g. home) and fail to resolve tailwindcss.
  turbopack: {
    root: appDir,
    resolveAlias: {
      tailwindcss: nm("tailwindcss"),
      "@tailwindcss/postcss": nm("@tailwindcss/postcss"),
    },
  },
  transpilePackages: ["@datalayer/jupyter-react"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
