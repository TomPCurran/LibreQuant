import type { Metadata } from "next";
import { InternalDocumentation } from "@/components/internal-documentation";
import { WorkbenchShell } from "@/components/workbench-shell";

export const metadata: Metadata = {
  title: "Documentation | LibreQuant",
  description:
    "In-app reference for this build: notebooks, kernel controls, data sources, OHLCV helpers, strategies, and MLflow experiments.",
};

export default function DocumentationPage() {
  return (
    <WorkbenchShell
      sectionEyebrow="Documentation"
      title="Documentation"
      subtitle="What you can do in this workbench today—notebooks, kernel controls, data sources, OHLCV caching, strategies, and MLflow experiments."
    >
      <InternalDocumentation />
    </WorkbenchShell>
  );
}
