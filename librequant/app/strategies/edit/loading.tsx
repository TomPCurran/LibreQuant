export default function StrategyEditorLoading() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="flex min-h-screen animate-pulse">
        <aside className="w-56 shrink-0 border-r border-black/6 bg-background/80 px-4 py-4 backdrop-blur-xl dark:border-white/10">
          <div className="mb-6 h-8 w-32 rounded-full bg-foreground/10" />
          <div className="flex flex-col gap-2">
            <div className="h-9 w-full rounded-full bg-foreground/8" />
            <div className="h-9 w-full rounded-full bg-foreground/8" />
            <div className="h-9 w-full rounded-full bg-foreground/8" />
            <div className="h-9 w-3/4 rounded-full bg-foreground/8" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 flex min-h-14 items-center justify-between gap-3 border-b border-black/6 bg-background/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 sm:px-6">
            <div className="space-y-2">
              <div className="h-5 w-40 max-w-full rounded-full bg-foreground/10" />
              <div className="h-3 w-72 max-w-full rounded-full bg-foreground/8" />
            </div>
            <div className="flex gap-2">
              <div className="h-11 w-11 rounded-full bg-foreground/10" />
              <div className="h-11 w-11 rounded-full bg-foreground/10" />
            </div>
          </header>
          <main className="flex flex-1 flex-col px-4 pb-10 pt-6 sm:px-6">
            <div className="mx-auto w-full max-w-5xl flex-1">
              <div className="mb-3 h-3 w-24 rounded-full bg-foreground/10" />
              <div className="flex gap-3">
                <div className="flex min-h-[400px] overflow-hidden rounded-xl border border-foreground/8">
                  <div className="w-48 shrink-0 bg-foreground/3" />
                  <div className="min-w-[600px] flex-1 bg-foreground/5" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
