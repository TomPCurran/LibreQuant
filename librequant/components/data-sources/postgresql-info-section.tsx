"use client";

import { DEFAULT_DATABASE_URL_KEY } from "@/lib/data-sources/custom-env-key";

export function PostgresqlInfoSection() {
  return (
    <>
      <p className="mb-4 text-sm font-light text-text-secondary">
        Local PostgreSQL is defined in the repo root{" "}
        <code className="font-mono-code text-[12px]">docker-compose.yml</code>{" "}
        <code className="font-mono-code text-[12px]">postgres</code> service.
        Defaults are user{" "}
        <code className="font-mono-code text-[12px]">librequant</code> and
        password{" "}
        <code className="font-mono-code text-[12px]">librequant</code> (local dev
        only). Override{" "}
        <code className="font-mono-code text-[12px]">POSTGRES_USER</code> /{" "}
        <code className="font-mono-code text-[12px]">POSTGRES_PASSWORD</code> in
        repo-root <code className="font-mono-code text-[12px]">.env</code> if
        needed (see{" "}
        <code className="font-mono-code text-[12px]">env.docker.example</code>
        ). Values are not shown in this UI.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-text-secondary marker:text-alpha/80">
        <li>
          <strong className="font-medium text-text-primary">Database:</strong>{" "}
          <code className="font-mono-code text-[12px]">librequant</code>. The
          bootstrap user is a{" "}
          <strong className="font-medium text-text-primary">
            PostgreSQL superuser
          </strong>{" "}
          (full admin) for local development.
        </li>
        <li>
          <strong className="font-medium text-text-primary">
            SQL clients on this machine:
          </strong>{" "}
          <code className="font-mono-code text-[12px]">127.0.0.1</code>, port{" "}
          <code className="font-mono-code text-[12px]">5432</code> by default (set{" "}
          <code className="font-mono-code text-[12px]">POSTGRES_HOST_PORT</code>{" "}
          in repo-root <code className="font-mono-code text-[12px]">.env</code> if
          that port is already in use, e.g.{" "}
          <code className="font-mono-code text-[12px]">5433</code>), database{" "}
          <code className="font-mono-code text-[12px]">librequant</code>, user and
          password match the Compose defaults or your repo-root{" "}
          <code className="font-mono-code text-[12px]">.env</code> overrides. If you
          set a custom password, avoid URL characters{" "}
          <code className="font-mono-code text-[11px]">@ : / ? # %</code> in{" "}
          <code className="font-mono-code text-[12px]">
            LIBREQUANT_DATABASE_URL
          </code>{" "}
          or encode it.
        </li>
        <li>
          <strong className="font-medium text-text-primary">
            Default in notebooks (Docker):
          </strong>{" "}
          Compose sets{" "}
          <code className="font-mono-code text-[12px]">
            {DEFAULT_DATABASE_URL_KEY}
          </code>{" "}
          (host <code className="font-mono-code text-[12px]">postgres</code>). Do
          not set that name in{" "}
          <code className="font-mono-code text-[12px]">.env.local</code> — it is
          reserved for this service. Use{" "}
          <code className="font-mono-code text-[12px]">
            librequant.data.get_database_url()
          </code>{" "}
          or{" "}
          <code className="font-mono-code text-[12px]">read_sql_frame()</code> for
          the default DB; use{" "}
          <code className="font-mono-code text-[12px]">
            get_database_url(&quot;SLUG&quot;)
          </code>{" "}
          for additional connections below.
        </li>
      </ul>
    </>
  );
}
