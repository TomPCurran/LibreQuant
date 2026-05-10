/**
 * In-app reference for features shipped in this build (single-machine research,
 * retail-style workflows, and OSS contributors running the stack locally).
 */

export function InternalDocumentation() {
  return (
    <article className="max-w-none text-sm font-light leading-relaxed text-text-primary">
      <p className="text-xs text-text-secondary">
        This page describes behaviors that exist in the current UI and Python
        helpers—not roadmap promises. Use it when you want a concise map of
        routes and panels without digging through the repo.
      </p>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          Notebook library vs home workbench
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Home (<code className="font-mono-code text-[12px]">/</code>)
            </strong>{" "}
            — Loads the notebook workbench when Jupyter is reachable. The open
            file is driven by the{" "}
            <code className="font-mono-code text-[12px]">path</code> query
            parameter (for example{" "}
            <code className="font-mono-code text-[12px]">?path=…</code>) under
            your Jupyter contents root.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Notebook library (
              <code className="font-mono-code text-[12px]">/notebooks</code>)
            </strong>{" "}
            — Create, upload, and open{" "}
            <code className="font-mono-code text-[12px]">.ipynb</code> files
            stored in your local Jupyter workspace via the library panel.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          Workspace & notebooks
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Edit notebooks in the browser
            </strong>{" "}
            — From home, pick a notebook from the sidebar tree (or set{" "}
            <code className="font-mono-code text-[12px]">?path=</code>) and edit
            cells with the embedded Jupyter UI. Content autosaves to the Jupyter
            Contents API under your configured library root when the server is
            reachable.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Work offline from the server file
            </strong>{" "}
            — Use{" "}
            <span className="text-text-primary">Save as…</span> in the notebook
            toolbar to write a copy of the current notebook JSON to your
            machine. Chromium-based browsers can show a system Save dialog (pick a
            folder); Safari and Firefox use a normal download to your default
            download folder because those engines do not expose the File System
            Access &quot;save as&quot; API widely—both behaviors are expected.
            The exported file is independent of the path inside Docker/Jupyter.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Rename the file on the server
            </strong>{" "}
            — Use the pencil control next to the notebook title in the toolbar to
            rename within the library (same as moving the file in Jupyter
            terms).
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          Notebook toolbar & kernel
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Run an entire analysis
            </strong>{" "}
            — <span className="text-text-primary">Run all</span> executes cells
            from top to bottom in order.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Stop a long run
            </strong>{" "}
            — <span className="text-text-primary">Interrupt</span> sends a
            kernel interrupt while the kernel is busy.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Clean state without rebuilding containers
            </strong>{" "}
            — <span className="text-text-primary">Reset session</span> clears
            outputs and restarts the Python kernel (variables reset; Docker is
            unchanged).
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Add dependencies
            </strong>{" "}
            — Open the package control to search PyPI and install into the
            kernel environment (when your deployment allows it).
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          Data sources (
          <code className="font-mono-code text-[12px]">/data-sources</code>)
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">API keys</strong>{" "}
            — Managed provider keys and custom uppercase names are edited here.
            Values are written to{" "}
            <code className="font-mono-code text-[12px]">
              librequant/.env.local
            </code>{" "}
            on the machine running Next.js; the UI shows presence/edit state,
            not secret values after save.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Workspace sync for kernels
            </strong>{" "}
            — Saving keys from the app also syncs{" "}
            <code className="font-mono-code text-[12px]">
              config/credentials.env
            </code>{" "}
            into your Jupyter workspace so kernels can load variables without
            restarting Docker in typical setups (see project README).{" "}
            <code className="font-mono-code text-[12px]">librequant.data</code>{" "}
            reloads that file on data calls.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              PostgreSQL & database URLs
            </strong>{" "}
            — Accordion sections cover Compose Postgres context and named
            connections using names like{" "}
            <code className="font-mono-code text-[12px]">
              LIBREQUANT_DB_*_URL
            </code>{" "}
            (see the form on this page for examples).
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Data library & uploads
            </strong>{" "}
            — The Data library section manages tabular uploads and visibility in
            your workspace tree alongside notebooks and strategies.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          OHLCV &amp;{" "}
          <code className="font-mono-code text-[12px]">librequant.data</code>
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Notebook usage
            </strong>{" "}
            — Import{" "}
            <code className="font-mono-code text-[12px]">
              get_bars from librequant.data
            </code>{" "}
            (see project README for a minimal example).
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Parquet cache
            </strong>{" "}
            — Repeated downloads are avoided via Parquet files under{" "}
            <code className="font-mono-code text-[12px]">
              data/cache/ohlcv/
            </code>{" "}
            inside your Jupyter workspace volume (path depends on your Compose
            bind mount).
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Working providers vs stubs
            </strong>{" "}
            —{" "}
            <code className="font-mono-code text-[12px]">source=&quot;yfinance&quot;</code>{" "}
            and{" "}
            <code className="font-mono-code text-[12px]">source=&quot;alpaca&quot;</code>{" "}
            fetch data.{" "}
            <code className="font-mono-code text-[12px]">polygon</code> and{" "}
            <code className="font-mono-code text-[12px]">tiingo</code> are
            accepted names but raise{" "}
            <code className="font-mono-code text-[12px]">
              NotImplementedError
            </code>{" "}
            until those connectors ship—you can still store API keys for later.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          Strategy library
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Organize Python strategies
            </strong>{" "}
            — Browse folders and{" "}
            <code className="font-mono-code text-[12px]">.py</code> files from
            the Strategies section and open the editor to change code stored in
            the workspace.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Keep notebooks and code aligned
            </strong>{" "}
            — Strategies live beside notebooks under the same local-first
            workspace model (paths depend on your Jupyter root configuration).
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          MLflow experiments (
          <code className="font-mono-code text-[12px]">/experiments</code>)
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Explorer page
            </strong>{" "}
            — Lists experiments from your local MLflow tracking server. Choose an
            experiment to load runs (metrics columns, sorting, expandable rows).
            Selecting exactly two runs opens a side-by-side params comparison.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Deep links &amp; sidebar
            </strong>{" "}
            — Experiment selection syncs to{" "}
            <code className="font-mono-code text-[12px]">?experiment=</code> in
            the URL for sharing a bookmark. The sidebar MLflow section lists
            experiments and links into Explorer with the same selection.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Equity preview
            </strong>{" "}
            — Expanding a run attempts to load an artifact{" "}
            <code className="font-mono-code text-[12px]">
              curves/equity_curve.csv
            </code>{" "}
            when your logging pipeline produced it; missing artifacts show an
            error state rather than blocking the table.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Out-of-sample tag
            </strong>{" "}
            — Runs can be tagged from the table UI (stored as MLflow tags) to
            mark an out-of-sample candidate—your methodology still defines what
            that means.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Full MLflow UI
            </strong>{" "}
            — Use{" "}
            <span className="text-text-primary">Open MLflow UI</span> in the
            sidebar to launch the native tracking UI in a new tab (URL from{" "}
            <code className="font-mono-code text-[12px]">
              NEXT_PUBLIC_MLFLOW_UI_URL
            </code>
            ).
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          Portfolio Monitor
        </h2>
        <p className="mt-3 text-text-secondary">
          Dedicated portfolio monitoring views are not implemented yet. This
          sidebar section is reserved; this documentation will grow here as
          features ship.
        </p>
      </section>
    </article>
  );
}
