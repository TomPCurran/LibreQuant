import fs from "node:fs/promises";

import type { Metadata } from "next";
import { DataSourcesPanel } from "@/components/data-sources/data-sources-panel";
import { WorkbenchShell } from "@/components/workbench-shell";
import { DataSourcesStatusProvider } from "@/lib/data-sources-status-context";
import type { CredentialsPresence } from "@/lib/data-sources-status-context";
import {
  envLocalAbsolutePath,
  listCustomEnvKeyNames,
  MANAGED_SECRET_KEYS,
  presenceForStatus,
  readEnvLocalMap,
} from "@/lib/merge-env-local";

export const metadata: Metadata = {
  title: "Data sources | LibreQuant",
  description:
    "Configure API keys and named Postgres connections (LIBREQUANT_DB_*_URL) in .env.local, use Docker Compose PostgreSQL, and manage tabular uploads in your Jupyter workspace.",
};

export default async function DataSourcesPage() {
  const map = await readEnvLocalMap();
  const initialCredentialsPresent = presenceForStatus(
    MANAGED_SECRET_KEYS,
    map,
  ) as CredentialsPresence;
  const initialCustomEnvKeys = listCustomEnvKeyNames(map);
  let envLocalFileExists = false;
  try {
    await fs.access(envLocalAbsolutePath());
    envLocalFileExists = true;
  } catch {
    envLocalFileExists = false;
  }

  return (
    <DataSourcesStatusProvider
      initial={{
        credentialsPresent: initialCredentialsPresent,
        customEnvKeys: initialCustomEnvKeys,
        envLocalFileExists,
      }}
    >
      <WorkbenchShell
        sectionEyebrow="Workspace"
        title="Data sources"
        subtitle="API keys and additional database connections (LIBREQUANT_DB_*_URL) in .env.local, default Postgres via Docker Compose, and tabular uploads under data/uploads in your Jupyter workspace."
      >
        <DataSourcesPanel />
      </WorkbenchShell>
    </DataSourcesStatusProvider>
  );
}
