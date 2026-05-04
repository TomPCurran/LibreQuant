import { Loader2 } from "lucide-react";

import type { PyPIProjectSummary } from "@/lib/types/pypi";

type Props = {
  results: PyPIProjectSummary[];
  installing: string | null;
  onInstall: (name: string) => void;
};

export function PackageSearchResults({
  results,
  installing,
  onInstall,
}: Props) {
  if (results.length === 0) return null;

  return (
    <ul className="max-h-72 overflow-auto rounded-2xl border border-black/6 bg-background py-1 dark:border-white/10">
      {results.map((p) => (
        <li key={p.name} className="border-b border-foreground/5 last:border-0">
          <div className="flex gap-2 px-2 py-2 text-left sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-mono-code text-sm text-foreground">{p.name}</p>
              {p.version ? (
                <p className="text-[10px] uppercase tracking-wide text-text-secondary">
                  {p.version}
                </p>
              ) : null}
              {p.summary ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                  {p.summary}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="shrink-0 self-start rounded-full bg-alpha px-4 py-2 text-xs font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90 disabled:opacity-50 sm:self-center"
              disabled={installing !== null}
              onClick={() => void onInstall(p.name)}
            >
              {installing === p.name ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Install"
              )}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
