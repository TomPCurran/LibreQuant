import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const jupyterOrigin =
  process.env.NEXT_PUBLIC_JUPYTER_BASE_URL ?? "http://localhost:8888";
const jupyterWs = jupyterOrigin.replace(/^http/, "ws");

const isDev = process.env.NODE_ENV !== "production";

const connectSrc = isDev
  ? `'self' ${jupyterOrigin} ${jupyterWs} ws: wss:`
  : "'self'";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // JupyterLab / @datalayer/jupyter-react rely on Yjs + kernel comms; React Strict Mode's
  // dev-only double mount disposes models while globals still reference the old Y.Doc,
  // which spams Yjs errors, "Disposed" rejections, and "Comm not found" noise.
  reactStrictMode: false,
  // Lock workspace to this app so Turbopack does not pick a parent lockfile (e.g. home) and fail to resolve tailwindcss.
  turbopack: {
    root: appDir,
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
