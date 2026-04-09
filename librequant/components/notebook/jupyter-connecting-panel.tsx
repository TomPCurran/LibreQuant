import { Loader2 } from "lucide-react";

type Props = {
  baseUrl: string;
};

export function JupyterConnectingPanel({ baseUrl }: Props) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Loader2
        className="size-8 animate-spin text-text-secondary"
        aria-hidden
      />
      <p className="max-w-md text-sm font-light leading-relaxed text-text-secondary">
        Connecting to Jupyter at{" "}
        <span className="font-mono-code text-text-primary">{baseUrl}</span>
        … Ensure Docker Jupyter is running and tokens match{" "}
        <code className="font-mono-code text-[12px] text-text-primary">
          .env.local
        </code>
        .
      </p>
    </div>
  );
}
