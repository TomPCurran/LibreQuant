import type { ReactNode } from "react";

type WorkbenchLoadingShellProps = {
  children: ReactNode;
  /** Full-width sidebar nav placeholders before the short row (home uses 2; strategies routes use 3). */
  asideFullNavRows?: number;
  /** Tailwind width class for the title bar skeleton (e.g. `w-64`). */
  headerTitleWidthClass?: string;
  /** Tailwind width class for the subtitle bar skeleton (e.g. `w-96`). */
  headerSubtitleWidthClass?: string;
};

/**
 * Shared aside + header pulse for App Router `loading.tsx` boundaries (Server Component).
 */
export function WorkbenchLoadingShell({
  children,
  asideFullNavRows = 3,
  headerTitleWidthClass = "w-48",
  headerSubtitleWidthClass = "w-80",
}: WorkbenchLoadingShellProps) {
  return (
    <div className="min-h-screen text-foreground">
      <div className="flex min-h-screen animate-pulse">
        <aside className="w-56 shrink-0 border-r border-black/6 bg-background/80 px-4 py-4 backdrop-blur-xl dark:border-white/10">
          <div className="mb-6 h-8 w-32 rounded-full bg-foreground/10" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: asideFullNavRows }, (_, i) => (
              <div
                key={i}
                className="h-9 w-full rounded-full bg-foreground/8"
              />
            ))}
            <div className="h-9 w-3/4 rounded-full bg-foreground/8" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 flex min-h-14 items-center justify-between gap-3 border-b border-black/6 bg-background/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 sm:px-6">
            <div className="space-y-2">
              <div
                className={`h-5 max-w-full rounded-full bg-foreground/10 ${headerTitleWidthClass}`}
              />
              <div
                className={`h-3 max-w-full rounded-full bg-foreground/8 ${headerSubtitleWidthClass}`}
              />
            </div>
            <div className="flex gap-2">
              <div className="h-11 w-11 rounded-full bg-foreground/10" />
              <div className="h-11 w-11 rounded-full bg-foreground/10" />
            </div>
          </header>
          <main className="flex flex-1 flex-col px-4 pb-10 pt-6 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
