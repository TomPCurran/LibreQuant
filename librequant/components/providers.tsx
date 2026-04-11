"use client";

import type { ReactNode } from "react";
import { JupyterReachabilityStack } from "@/lib/jupyter-reachability-context";

/**
 * Client-side providers that wrap the entire app.
 *
 * Separated from the server-component `layout.tsx` so we can use
 * hooks / context without making the root layout a client component.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <JupyterReachabilityStack>{children}</JupyterReachabilityStack>;
}
