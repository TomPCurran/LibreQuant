import { Loader2 } from "lucide-react";
import {
  NOTEBOOK_PHASE_DESCRIPTION,
  NOTEBOOK_PHASE_TITLE,
} from "@/lib/jupyter-notebook-phase";

type Phase = "connecting_jupyter" | "starting_kernel" | "loading_notebook_file";

type Props = {
  phase: Phase;
  /** Shown for `connecting_jupyter` so users can verify env matches. */
  baseUrl?: string;
};

/**
 * Shared loading layout for notebook workbench phases (Jupyter connection vs kernel vs file).
 */
export function NotebookLoadingState({ phase, baseUrl }: Props) {
  const title = NOTEBOOK_PHASE_TITLE[phase];
  const description = NOTEBOOK_PHASE_DESCRIPTION[phase];

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Loader2
        className="size-8 animate-spin text-text-secondary"
        aria-hidden
      />
      <p className="heading-brand max-w-md text-base text-text-primary">{title}</p>
      <p className="max-w-md text-sm font-light leading-relaxed text-text-secondary">
        {description}
      </p>
      {phase === "connecting_jupyter" && baseUrl ? (
        <p className="max-w-md text-xs font-light leading-relaxed text-text-secondary">
          Jupyter origin:{" "}
          <span className="font-mono-code text-text-primary">{baseUrl}</span>
          . Ensure Docker is running and{" "}
          <code className="font-mono-code text-[12px] text-text-primary">
            .env.local
          </code>{" "}
          matches the server token.
        </p>
      ) : null}
    </div>
  );
}
