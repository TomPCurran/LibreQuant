import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";

export default function NotebooksLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-brand-teal focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-black/6 bg-background/80 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-3 text-inherit no-underline"
          >
            <Image
              src="/favicon.ico"
              alt="LibreQuant"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0"
              priority
            />
            <span className="flex flex-col gap-0.5 leading-none sm:flex-row sm:items-baseline sm:gap-2">
              <span className="heading-brand text-base tracking-tight text-foreground">
                <span className="font-light">Libre</span>
                <span className="font-semibold">Quant</span>
              </span>
              <span className="hidden text-sm font-light text-brand-gray sm:inline">
                Research
                <span className="font-semibold text-foreground"> workbench</span>
              </span>
            </span>
          </Link>
          <nav
            className="flex flex-wrap items-center gap-2 text-xs font-medium text-brand-gray md:gap-3"
            aria-label="Workspace navigation"
          >
            <Link
              href="/notebooks"
              className="rounded-full border border-foreground/15 bg-white/70 px-3 py-1.5 text-foreground dark:bg-zinc-800/80"
            >
              Notebooks
            </Link>
            <ThemeToggle />
            <span className="rounded-full border border-foreground/10 bg-white/70 px-3 py-1.5 dark:bg-zinc-800/80">
              Local · Paper
            </span>
            <button
              type="button"
              className="rounded-full bg-brand-teal px-3 py-1.5 font-medium text-white shadow-sm transition hover:bg-brand-teal/90"
            >
              Run backtest
            </button>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-black/6 py-6 text-center text-xs text-brand-gray dark:border-white/10">
        LibreQuant — notebooks
      </footer>
    </>
  );
}
