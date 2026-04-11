"use client";

/**
 * Re-export from the singleton Context module.
 *
 * All prior import sites (`import { useJupyterServiceManager } from
 * "@/lib/use-jupyter-service-manager"`) continue to work unchanged.
 */
export {
  useJupyterServiceManager,
  JupyterServiceManagerProvider,
} from "@/lib/jupyter-service-manager-context";
