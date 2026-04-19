/**
 * Internal use-case guide for features shipped in this app (contributors & power users).
 */

export function InternalDocumentation() {
  return (
    <article className="max-w-none text-sm font-light leading-relaxed text-text-primary">
      <p className="text-xs text-text-secondary">
        This page lists practical use cases for what is implemented today. It is
        aimed at contributors and advanced users; end-user docs may live
        elsewhere as the project grows.
      </p>

      <section className="mt-8">
        <h2 className="heading-brand text-base text-foreground">
          Workspace & notebooks
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Edit notebooks in the browser
            </strong>{" "}
            — Open the home workspace, pick a notebook from the sidebar tree (or
            URL <code className="font-mono-code text-[12px]">?path=</code>), and
            edit cells with the embedded Jupyter UI. Content autosaves to the
            Jupyter Contents API under your configured library root when the
            server is reachable.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Work offline from the server file
            </strong>{" "}
            — Use{" "}
            <span className="text-text-primary">Save as…</span> in the notebook
            toolbar to write a copy of the current notebook JSON to your
            machine. Chromium-based browsers can show a system Save dialog
            (pick a folder); Safari and Firefox use a normal download to your
            default download folder because those engines do not expose the
            File System Access &quot;save as&quot; API widely—both behaviors are
            expected. The exported file is independent of the path inside
            Docker/Jupyter.
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
          Data sources
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-secondary marker:text-alpha/80">
          <li>
            <strong className="font-medium text-text-primary">
              Connect market data APIs
            </strong>{" "}
            — Configure API keys in{" "}
            <code className="font-mono-code text-[12px]">.env.local</code> (see
            the Data sources page and project README). The UI reflects which
            managed keys are present without exposing values.
          </li>
          <li>
            <strong className="font-medium text-text-primary">
              Use tabular files in notebooks
            </strong>{" "}
            — Upload or place CSV/Excel under the data uploads area in your
            Jupyter workspace; the sidebar tree under Data library helps you see
            what is on disk.
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
            — Browse folders and <code className="font-mono-code text-[12px]">
              .py
            </code>{" "}
            files from the Strategies section and open the editor to change code
            stored in the workspace.
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
          Portfolio Monitor
        </h2>
        <p className="mt-3 text-text-secondary">
          Dedicated portfolio monitoring views are not implemented yet. This
          sidebar section is reserved; internal documentation will grow here as
          features ship.
        </p>
      </section>
    </article>
  );
}
