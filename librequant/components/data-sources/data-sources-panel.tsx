"use client";

import dynamic from "next/dynamic";
import { Database, KeyRound, RefreshCw, Upload } from "lucide-react";

import { CustomEnvForm } from "./custom-env-form";
import { DatabaseConnectionsForm } from "./database-connections-form";
import { DataSourcesAccordionSection } from "./data-sources-accordion";
import { ManagedCredentialsForm } from "./managed-credentials-form";
import { PostgresqlInfoSection } from "./postgresql-info-section";
import { useCredentialSave } from "./use-credential-save";

const DataLibraryManager = dynamic(
  () => import("@/components/data-library-manager.client"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-foreground/10 py-12 text-center text-sm text-text-secondary">
        Loading data library…
      </div>
    ),
  },
);

export type { CredentialsPresence } from "@/lib/data-sources-status-context";

export function DataSourcesPanel() {
  const cred = useCredentialSave();

  return (
    <div className="mt-8 space-y-8">
      <DataSourcesAccordionSection title="API keys" icon={KeyRound} defaultOpen>
        <p className="mb-6 text-sm font-light text-text-secondary">
          Values are written only to{" "}
          <code className="font-mono-code text-[12px]">
            librequant/.env.local
          </code>{" "}
          on the machine running Next.js (
          {cred.envLocalFileExists ? "file exists" : "file will be created"}).
          Secrets are not shown after save — use{" "}
          <strong className="font-medium text-text-primary">Edit</strong> to
          rotate a stored key.
        </p>

        <form onSubmit={cred.onSaveCredentials} className="space-y-6">
          <ManagedCredentialsForm cred={cred} />
          <CustomEnvForm cred={cred} />

          <div className="flex flex-wrap items-center gap-3 border-t border-foreground/10 pt-4">
            <button
              type="submit"
              disabled={cred.saving}
              className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-alpha px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {cred.saving ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save keys"
              )}
            </button>
            <button
              type="button"
              className="text-sm font-medium text-alpha underline-offset-4 hover:underline"
              onClick={() => void cred.refreshPresence()}
            >
              Refresh status
            </button>
          </div>
        </form>
        {cred.saveMsg ? (
          <p className="mt-4 text-sm text-text-secondary" role="status">
            {cred.saveMsg}
          </p>
        ) : null}
      </DataSourcesAccordionSection>

      <DataSourcesAccordionSection title="PostgreSQL" icon={Database} defaultOpen>
        <PostgresqlInfoSection />
      </DataSourcesAccordionSection>

      <DataSourcesAccordionSection
        title="Database connections"
        icon={Database}
        defaultOpen
      >
        <DatabaseConnectionsForm cred={cred} />
      </DataSourcesAccordionSection>

      <DataSourcesAccordionSection title="Data library" icon={Upload} defaultOpen>
        <DataLibraryManager />
      </DataSourcesAccordionSection>
    </div>
  );
}
