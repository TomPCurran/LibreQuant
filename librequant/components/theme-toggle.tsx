"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer theme-dependent UI until after mount; next-themes has no stable theme on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration gate for next-themes
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle color theme"
        aria-disabled="true"
        tabIndex={-1}
        className="pointer-events-none inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-foreground opacity-70"
      >
        <span className="size-4 rounded-full bg-foreground/10" aria-hidden />
      </button>
    );
  }

  /* Align icon with what is painted (html class); matches next-themes resolved theme */
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-foreground transition hover:border-alpha/40 hover:text-alpha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alpha/35"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
