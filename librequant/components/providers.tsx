"use client";

import type { ReactNode } from "react";
import { JupyterServiceManagerProvider } from "@/lib/jupyter-service-manager-context";

/**
 * Client-side providers that wrap the entire app.
 *
 * Separated from the server-component `layout.tsx` so we can use
 * hooks / context without making the root layout a client component.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <JupyterServiceManagerProvider>{children}</JupyterServiceManagerProvider>
  );
}
