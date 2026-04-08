"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
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
        className="pointer-events-none inline-flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/10 bg-background/80 text-foreground opacity-70 transition hover:border-brand-teal/40 hover:text-brand-teal"
      >
        <span className="size-4 rounded-sm bg-foreground/10" aria-hidden />
      </button>
    );
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/10 bg-background/80 text-foreground transition hover:border-brand-teal/40 hover:text-brand-teal"
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
