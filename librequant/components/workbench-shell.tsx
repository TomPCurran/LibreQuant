"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWorkbenchStore } from "@/lib/stores/workbench-store";
import { LineChart, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const JupyterWorkbench = dynamic(
  () =>
    import("@/lib/ensure-webpack-public-path")
      .then(() => import("@/components/notebook/jupyter-workbench"))
      .then((m) => m.JupyterWorkbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm font-light text-text-secondary">
        Loading notebook runtime…
      </div>
    ),
  }
);

function NavItem({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-full px-2 py-2 text-xs font-medium transition hover:bg-foreground/5 ${
        active
          ? "text-alpha"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

export function WorkbenchShell() {
  const sidebarOpen = useWorkbenchStore((s) => s.sidebarOpen);
  const toggleSidebar = useWorkbenchStore((s) => s.toggleSidebar);

  return (
    <div className="flex min-h-screen text-foreground">
      <aside
        className={`shrink-0 border-r border-black/6 bg-background/80 backdrop-blur-xl transition-[width] dark:border-white/10 ${
          sidebarOpen ? "w-56 px-4" : "w-14 px-2"
        } py-4`}
      >
        <div className="mb-6 flex items-center gap-2">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground"
            aria-hidden
          >
            <LineChart className="size-[18px] opacity-90" strokeWidth={1.75} />
          </div>
          {sidebarOpen ? (
            <div className="min-w-0">
              <span className="heading-brand block truncate text-sm text-foreground">
                LibreQuant
              </span>
              <span className="mt-1 block text-[10px] font-light leading-snug text-text-secondary">
                Open source · Local-first · MIT
              </span>
            </div>
          ) : null}
        </div>
        {sidebarOpen ? (
          <nav className="flex flex-col gap-0.5" aria-label="Primary">
            <NavItem label="Workspace" href="/" active />
            <NavItem label="Strategy Library" href="#" />
            <NavItem label="Data Ingestors" href="#" />
            <NavItem label="Portfolio Monitor" href="#" />
          </nav>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-black/6 bg-background/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 sm:px-6">
          <div className="min-w-0">
            <p className="heading-brand text-base text-foreground">
              The Local-First Workbench for Algorithmic Alpha.
            </p>
            <p className="mt-0.5 text-xs font-light text-text-secondary">
              Python kernels via Jupyter protocol — the Assistant; you are the
              Architect.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-pressed={sidebarOpen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-foreground transition hover:border-alpha/40 hover:text-alpha"
              onClick={() => toggleSidebar()}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" aria-hidden />
              ) : (
                <PanelLeftOpen className="size-4" aria-hidden />
              )}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          <div className="flex flex-1 flex-col px-4 pb-10 pt-6 sm:px-6">
            <div className="mx-auto w-full max-w-[1280px] flex-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Workspace
              </p>
              <div className="min-h-[min(72vh,840px)] bg-transparent p-0 md:p-0">
                <JupyterWorkbench />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
