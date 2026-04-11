import { Suspense } from "react";
import { StrategyEditorShell } from "@/components/strategies/strategy-editor-shell";

export const metadata = {
  title: "Edit Strategy | LibreQuant",
  description: "Edit a Python strategy file in the browser-based code editor.",
};

export default function StrategyEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm font-light text-text-secondary">
          Loading editor…
        </div>
      }
    >
      <StrategyEditorShell />
    </Suspense>
  );
}
