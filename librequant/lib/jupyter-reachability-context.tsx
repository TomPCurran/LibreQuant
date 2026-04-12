"use client";

/**
 * @module jupyter-reachability-context
 *
 * Probes the Jupyter Server HTTP API (`GET /api/kernels`) on an interval, exposes
 * `probeComplete` + `reachable` to gate UI (e.g. home workspace), remounts
 * {@link JupyterServiceManagerProvider} when reachability flips so `ServiceManager` is not stale,
 * and renders a sticky banner when the server is down.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getPublicJupyterConfig } from "@/lib/env";
import { JupyterServiceManagerProvider } from "@/lib/jupyter-service-manager-context";

const PROBE_INTERVAL_MS = 5000;

async function probeJupyterServerReachable(
  baseUrl: string,
  token: string,
): Promise<boolean> {
  try {
    const root = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = new URL("api/kernels", root);
    url.searchParams.set("token", token);
    const res = await fetch(url.toString(), {
      credentials: "include",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

type JupyterReachabilityValue = {
  /** At least one HTTP probe to `/api/kernels` has finished (success or failure). */
  probeComplete: boolean;
  /** Jupyter Server HTTP API responded OK on the last probe and a token is configured. */
  reachable: boolean;
};

const JupyterReachabilityContext = createContext<JupyterReachabilityValue>({
  probeComplete: false,
  reachable: false,
});

export function useJupyterReachability(): JupyterReachabilityValue {
  return useContext(JupyterReachabilityContext);
}

/**
 * Probes Jupyter Server on an interval; when availability flips, remounts
 * {@link JupyterServiceManagerProvider} so `ServiceManager` is not left stale
 * after Docker restart or network blips.
 */
export function JupyterReachabilityStack({ children }: { children: ReactNode }) {
  const { baseUrl, token } = getPublicJupyterConfig();
  const hasToken = Boolean(token);
  const [remountKey, setRemountKey] = useState(0);
  const [serverReachable, setServerReachable] = useState(false);
  const [probeComplete, setProbeComplete] = useState(false);
  const prevOkRef = useRef<boolean | null>(null);

  const reachable = hasToken && serverReachable;

  useEffect(() => {
    if (!hasToken) {
      queueMicrotask(() => {
        setProbeComplete(true);
        setServerReachable(false);
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      const ok = await probeJupyterServerReachable(baseUrl, token);
      if (cancelled) return;
      setProbeComplete(true);
      const prev = prevOkRef.current;
      if (prev !== null && prev !== ok) {
        setRemountKey((k) => k + 1);
      }
      if (ok && prev !== true) {
        const mode =
          process.env.NODE_ENV === "production" ? "production" : "development";
        console.info(
          `[librequant] Jupyter HTTP API reachable [${mode}] ${baseUrl}`,
        );
      }
      prevOkRef.current = ok;
      setServerReachable(ok);
    };

    void run();
    const id = setInterval(() => void run(), PROBE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [baseUrl, hasToken, token]);

  const value: JupyterReachabilityValue = { probeComplete, reachable };

  return (
    <JupyterReachabilityContext.Provider value={value}>
      <JupyterServerDownBanner />
      <JupyterServiceManagerProvider key={remountKey}>
        {children}
      </JupyterServiceManagerProvider>
    </JupyterReachabilityContext.Provider>
  );
}

function JupyterServerDownBanner() {
  const { probeComplete, reachable } = useJupyterReachability();
  if (reachable || !probeComplete) {
    return null;
  }
  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-risk/35 bg-risk/15 px-4 py-2 text-center text-xs font-medium text-text-primary dark:bg-risk/20"
    >
      Jupyter server unreachable — reconnecting. If this persists, ensure Docker Jupyter is
      running and reload the page.
    </div>
  );
}
