"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWorkbenchStore } from "@/lib/stores/workbench-store";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const JupyterWorkbench = dynamic(
  () =>
    import("@/lib/ensure-webpack-public-path")
      .then(() => import("@/components/notebook/jupyter-workbench"))
      .then((m) => m.JupyterWorkbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-foreground/10 bg-background/60 text-sm text-text-secondary">
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
      className={`block rounded-lg px-2 py-1.5 text-xs uppercase tracking-widest transition hover:bg-foreground/5 ${
        active ? "text-brand-teal" : "text-text-secondary hover:text-foreground"
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
    <div className="min-h-screen bg-background bg-grid-pattern text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`shrink-0 border-r border-foreground/10 bg-background/80 px-2 py-3 transition-[width] ${
            sidebarOpen ? "w-52" : "w-12"
          }`}
        >
          <div className="mb-4 flex items-center gap-2 px-1">
            <Image
              src="/mark.svg"
              alt=""
              width={28}
              height={28}
              className="opacity-90 dark:invert"
              priority
            />
            {sidebarOpen ? (
              <span className="heading-brand text-sm text-foreground">
                LibreQuant
              </span>
            ) : null}
          </div>
          {sidebarOpen ? (
            <nav className="flex flex-col gap-1" aria-label="Primary">
              <NavItem label="Workspace" href="/" active />
              <NavItem label="Strategy Library" href="#" />
              <NavItem label="Data Ingestors" href="#" />
              <NavItem label="Portfolio Monitor" href="#" />
            </nav>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-foreground/10 px-3 py-2">
            <div>
              <p className="heading-brand text-base text-foreground">
                Nexus workbench
              </p>
              <p className="text-xs text-text-secondary">
                Python kernels via Jupyter protocol · local-first
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-pressed={sidebarOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/10 bg-background/80 text-foreground transition hover:border-brand-teal/40 hover:text-brand-teal"
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

          <main className="flex flex-1 flex-col px-3 py-3 pb-10 sm:px-4">
            <div className="mx-auto w-full max-w-[1280px]">
              <JupyterWorkbench />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
