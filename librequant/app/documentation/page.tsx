import type { Metadata } from "next";
import { InternalDocumentation } from "@/components/internal-documentation";
import { WorkbenchShell } from "@/components/workbench-shell";

export const metadata: Metadata = {
  title: "Documentation | LibreQuant",
  description:
    "Internal use cases for LibreQuant features: notebooks, data sources, strategies, and workspace.",
};

export default function DocumentationPage() {
  return (
    <WorkbenchShell
      sectionEyebrow="Portfolio Monitor"
      title="Documentation"
      subtitle="Use cases for features available in this build—notebooks, kernel controls, data sources, and the strategy library."
    >
      <InternalDocumentation />
    </WorkbenchShell>
  );
}
