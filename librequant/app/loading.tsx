export default function Loading() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="flex min-h-screen animate-pulse">
        <aside className="w-56 shrink-0 border-r border-black/6 bg-background/80 px-4 py-4 backdrop-blur-xl dark:border-white/10">
          <div className="mb-6 h-8 w-32 rounded-full bg-foreground/10" />
          <div className="flex flex-col gap-2">
            <div className="h-9 w-full rounded-full bg-foreground/8" />
            <div className="h-9 w-full rounded-full bg-foreground/8" />
            <div className="h-9 w-3/4 rounded-full bg-foreground/8" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 flex min-h-14 items-center justify-between gap-3 border-b border-black/6 bg-background/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 sm:px-6">
            <div className="space-y-2">
              <div className="h-5 w-64 max-w-full rounded-full bg-foreground/10" />
              <div className="h-3 w-96 max-w-full rounded-full bg-foreground/8" />
            </div>
            <div className="flex gap-2">
              <div className="h-11 w-11 rounded-full bg-foreground/10" />
              <div className="h-11 w-11 rounded-full bg-foreground/10" />
            </div>
          </header>
          <main className="flex flex-1 flex-col px-4 pb-10 pt-6 sm:px-6">
            <div className="mx-auto w-full max-w-[1280px] flex-1">
              <div className="mb-3 h-3 w-24 rounded-full bg-foreground/10" />
              <div className="min-h-[min(72vh,840px)] bg-transparent p-0">
                <div className="flex min-h-[280px] items-center justify-center rounded-3xl bg-foreground/5" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
