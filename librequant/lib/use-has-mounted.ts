"use client";

import { useEffect, useState } from "react";

/**
 * False on the server and on the first client render; true after mount.
 * Use to gate values that depend on browser-only state so SSR markup matches hydration.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Hydration gate: keep first client paint aligned with SSR, then enable browser-only UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount transition
    setMounted(true);
  }, []);
  return mounted;
}
