import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "../components/theme-toggle";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-brand-teal focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-black/6 bg-background/80 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
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
            aria-label="Demo navigation"
          >
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

      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10"
      >
        <section aria-labelledby="health-heading">
          <p
            id="health-heading"
            className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-brand-gray"
          >
            Global health
          </p>
          <div className="glass grid gap-4 rounded-2xl p-5 shadow-md shadow-foreground/5 sm:grid-cols-3">
            <Metric label="Net P&amp;L" value="+2.4%" positive />
            <Metric label="Max drawdown" value="−1.1%" danger />
            <Metric label="Sharpe (rolling)" value="1.82" neutral />
          </div>
        </section>

        <section aria-labelledby="strategy-heading">
          <p
            id="strategy-heading"
            className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-brand-gray"
          >
            Strategy cell
          </p>
            <div className="glass overflow-hidden rounded-4xl shadow-md shadow-foreground/5">
            <div className="grid border-b border-black/6 bg-white/40 px-4 py-2 text-xs text-brand-gray dark:border-white/10 dark:bg-zinc-900/50">
              <span className="font-mono-code text-[11px] text-foreground/80">
                momentum_alpha.py
              </span>
            </div>
            <div className="grid lg:grid-cols-[3fr_2fr]">
              <div className="border-b border-black/6 bg-background p-4 lg:border-b-0 lg:border-r dark:border-white/10">
                <pre className="font-mono-code text-left text-[13px] leading-relaxed text-foreground">
                  <code>
                    <span className="text-brand-teal">def</span>{" "}
                    <span className="text-foreground">on_bar</span>
                    {"("}
                    <span className="text-brand-gray">ctx</span>
                    {"):\n"}
                    {"  "}
                    <span className="text-brand-teal">return</span>{" "}
                    <span className="text-brand-gray">ctx</span>
                    {".close > ctx.open * ("}
                    <span className="rounded bg-brand-teal/10 px-1 text-brand-teal">
                      momentum
                    </span>
                    {" + 1)"}
                  </code>
                </pre>
              </div>
              <aside className="space-y-5 bg-white/30 p-5 dark:bg-zinc-800/40">
                <p className="heading-brand text-sm text-foreground">
                  Parameter bridge
                </p>
                <SliderRow label="Momentum" value={62} />
                <SliderRow label="Stop %" value={28} />
                <SliderRow label="Position cap" value={45} />
                <p className="text-xs font-light leading-relaxed text-brand-gray">
                  Parameters update from the editor AST within tens of milliseconds
                  after you pause typing.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section aria-labelledby="critique-heading">
          <p
            id="critique-heading"
            className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-brand-gray"
          >
            AI critique
          </p>
          <div className="animate-soft-pulse rounded-2xl border border-brand-teal/15 bg-brand-teal/5 p-5">
            <p className="text-sm font-light leading-relaxed text-foreground">
              Consider tightening the stop when realized volatility exceeds the
              trailing median — your current window may be too wide for thin
              liquidity sessions.
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-black/6 py-6 text-center text-xs text-brand-gray dark:border-white/10">
        LibreQuant UI mock — glass, grid, brand tokens
      </footer>
    </>
  );
}

function Metric({
  label,
  value,
  positive,
  danger,
  neutral,
}: {
  label: string;
  value: string;
  positive?: boolean;
  danger?: boolean;
  neutral?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-light uppercase tracking-wide text-brand-gray">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
          positive
            ? "text-brand-teal"
            : danger
              ? "text-brand-rose"
              : neutral
                ? "text-foreground"
                : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SliderRow({ label, value }: { label: string; value: number }) {
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-xs font-medium text-brand-gray">
        {label}
        <span className="font-mono-code tabular-nums text-foreground">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        defaultValue={value}
        readOnly
        aria-readonly
        className="h-2 w-full cursor-default appearance-none rounded-full bg-black/10 accent-brand-teal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-teal/20 dark:bg-white/15"
      />
    </label>
  );
}
