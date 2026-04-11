# LibreQuant

Browser-based quantitative research workbench: Next.js App Router shell with [`@datalayer/jupyter-react`](https://www.npmjs.com/package/@datalayer/jupyter-react) talking to a local Jupyter Server over the standard Jupyter protocol (WebSockets + REST).

### Status model (Jupyter vs frontend)

The UI separates three layers so it is clear what is doing the work:

| Layer                  | What it is                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LibreQuant shell**   | Next.js app in your browser (routing, layout, editors).                                                                                                                                   |
| **Jupyter connection** | Network session to the Jupyter Server (REST for files, WebSockets for the kernel). If this reconnects, the toolbar may show a notice; cell output can lag briefly until IOPub catches up. |
| **Python kernel**      | The process that runs notebook code. **Reset session** restarts this process and clears outputs; it does **not** restart Docker or the Jupyter Server.                                    |
| **Notebook file**      | The `.ipynb` JSON loaded and saved through the Jupyter Contents API (your workspace on disk inside the container).                                                                        |

Loading screens spell out which phase is active (connecting to the server vs starting the kernel vs loading the file). See [`lib/jupyter-notebook-phase.ts`](lib/jupyter-notebook-phase.ts) for the shared copy.

## Prerequisites

- Node.js 20+
- Docker (for the bundled Jupyter Server)

## Configuration

Copy [`.env.example`](.env.example) to `.env.local` and adjust. Variables are documented inline in `.env.example`; the important ones:

| Variable                            | Purpose                                                                                                                                                                                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_JUPYTER_BASE_URL`      | Jupyter Server HTTP origin (no trailing slash), e.g. `http://127.0.0.1:8888`. Prefer **127.0.0.1** with Docker’s default port map (`127.0.0.1:8888`); `localhost` can resolve to IPv6 first on macOS and fail while the server listens on IPv4 only. The app normalizes `localhost` → `127.0.0.1` for this URL. |
| `NEXT_PUBLIC_JUPYTER_TOKEN`         | Login token for Jupyter; must match the server (e.g. Docker `JUPYTER_TOKEN`). **Treat as a password** — it is exposed to the browser.                                                                                                                                                                           |
| `NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT` | Contents path for the notebook library relative to Jupyter root (default `work/librequant`).                                                                                                                                                                                                                    |
| `NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH` | Set to `1` when the Jupyter server puts the strategies tree on kernel `PYTHONPATH` (default Docker `docker-compose.yml`). Skips browser `executeCode` `sys.path` injection. If you change `NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT` or `NEXT_PUBLIC_JUPYTER_USER_HOME`, update the `PYTHONPATH` line in `docker-compose.yml` so it matches `getJupyterUserHomeAbsolute()` + `getStrategyLibraryRoot()` in `lib/env.ts`. |
| `NEXT_PUBLIC_JUPYTER_USER_HOME`     | Absolute Linux home inside the container for kernel snippets that join paths (default `/home/jovyan`).                                                                                                                                                                                                          |
| `NEXT_PUBLIC_JUPYTER_VERBOSE`       | Set to `1` to disable dev log filtering in `lib/jupyter-dev-noise.ts`.                                                                                                                                                                                                                                          |

Runtime resolution and validation live in [`lib/env.ts`](lib/env.ts) (JSDoc on each export).

## Jupyter Server (Docker)

**Scope:** This stack is **local-only** — a browser on your machine talking to Jupyter on **localhost**. It is not intended for public or multi-tenant deployment without additional hardening. See [SECURITY.md](SECURITY.md) for the threat model.

From this directory:

```bash
docker compose up
```

This starts `quay.io/jupyter/scipy-notebook` with:

- **`PYTHONPATH`** including `/home/jovyan/work/librequant/strategies` so notebook kernels see strategy packages without per-load `executeCode` (keep in sync with `NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT` / `NEXT_PUBLIC_JUPYTER_USER_HOME` if you change them).
- Port **8888** bound to **127.0.0.1** on the host (not advertised on the LAN from Docker’s port mapping).
- Token **`devtoken`** (`NEXT_PUBLIC_JUPYTER_TOKEN` must match). **Treat the token like a password** — it is bundled into the client and grants full access to the Jupyter server and its mounted files.
- CORS for the Next dev origins and **`Access-Control-Allow-Credentials`** (required because `@jupyterlab/services` uses credentialed fetch).
- **XSRF checks disabled** on Jupyter (`ServerApp.disable_check_xsrf`) because the app (`http://localhost:3000`) and Jupyter (`http://localhost:8888`) are different origins; the token and restricted CORS still apply. Acceptable for local dev; **do not expose port 8888 to untrusted networks** (see [SECURITY.md](SECURITY.md)).

If the app shows “Connecting to Jupyter…” forever, confirm `NEXT_PUBLIC_JUPYTER_TOKEN` matches the container (`devtoken` by default) and restart the app after changing env. An empty token is rejected by Jupyter (403 on `/api/*`).

### Notebook files and persistence

- Compose mounts a named Docker volume on **`/home/jovyan/work`**, so anything under Jupyter’s `work/` tree (including the default library folder) survives container restarts.
- Set **`NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT`** (see `.env.example`) to the directory **relative to the Jupyter server root** where the app lists and saves notebooks (default: `work/librequant`). The app creates that folder on first use if it does not exist.
- To back up notebooks, copy the volume data (`docker run --rm -v jupyter-librequant-work:/data …`) or bind-mount a host directory instead of the named volume in `docker-compose.yml`.

## One command: Jupyter + Next dev

After `npm install`, from this directory:

```bash
npm run dev:stack
```

This runs `docker compose up -d`, waits until port **8888** accepts TCP, then until the Jupyter HTTP API responds on **`/api/kernels`**, creates `.env.local` from `.env.example` if it is missing, then starts `npm run dev` (Next on **http://localhost:3000**). The home workspace waits for the same HTTP probe before loading the notebook UI. Press **Ctrl+C** to stop the dev server and run `docker compose down` (omit stopping Jupyter with `npm run dev:stack -- --keep-jupyter`). To only start Next (Jupyter already running elsewhere): `npm run dev:stack -- --no-docker`.

**`--no-docker` / external Jupyter:** Either configure the same **`PYTHONPATH`** on that server (absolute path to your strategies root inside the server filesystem) and keep `NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH=1`, or set `NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH` unset/`0` so the app uses client-side `sys.path` injection again.

### Dev terminal: `socket hang up` / `ECONNRESET`

Next.js dev (especially with Turbopack) or aborted browser connections can occasionally log **`Error: socket hang up`** with code **`ECONNRESET`**. That usually means a TCP connection closed while a request or HMR channel was in flight (tab refresh, navigation between routes, or Jupyter reconnecting). It is not the same as a bug in your notebook code. [`instrumentation.ts`](instrumentation.ts) installs dev-only handlers so these errors are less likely to tear down the process; you may still see a single log line from Next. If the app keeps working, you can ignore it.

### Jupyter log: `404` / “Kernel does not exist”

After **`docker compose` restarts Jupyter**, old kernel IDs are gone. A browser tab that was open before the restart (or another tab still pointing at `localhost:3000`) may briefly issue **`GET /api/kernels/{id}`** and get **404** — the UI is asking for a kernel the server no longer has. **Refresh the tab** (or close extra tabs) so the workbench starts a new session; the message is harmless if the app recovers. The notebook hook uses the same `ServiceManager` as the sidebar so you do not run two parallel Jupyter clients in one page.

## Web app (manual)

Copy `.env.example` to `.env.local` and adjust if needed:

```bash
cp .env.example .env.local
```

Install and run the Next.js dev server:

```bash
npm install
npm run dev
```

`predev` / `prebuild` copy JupyterLab theme variable CSS into `public/jupyter/` because Turbopack does not support the `variables.css?raw` import used inside `@datalayer/jupyter-react`’s `JupyterLabCss` (you would otherwise see `[JupyterLabCss] Failed to load theme variables` and a broken editor theme).

Open [http://localhost:3000](http://localhost:3000). The notebook connects to `NEXT_PUBLIC_JUPYTER_BASE_URL` using `NEXT_PUBLIC_JUPYTER_TOKEN` (must match the Jupyter server token).

## Scripts

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev:stack` | Docker Jupyter + Next dev (recommended locally) |
| `npm run dev`       | Development server                              |
| `npm run build`     | Production build                                |
| `npm run start`     | Start production server                         |
| `npm run lint`      | ESLint (Next flat config)                       |

## Security notes

Full detail: **[SECURITY.md](SECURITY.md)** (trusted machine / trusted browser, Jupyter token sensitivity, XSRF and CORS rationale).

- **React Strict Mode is disabled** in `next.config.ts` so the Jupyter notebook runtime (Yjs + kernel comms) is not torn down twice in development; re-enable only if you accept noisy Yjs / “Comm not found” errors from `@datalayer/jupyter-react`.
- JupyterLab 4’s notebook model always uses **Yjs** (`@jupyter/ydoc`); `collaborative: false` only turns off RTC. Benign Yjs / comm / LabIcon SVG messages in dev are filtered while the notebook is mounted (see `lib/jupyter-dev-noise.ts`); set `NEXT_PUBLIC_JUPYTER_VERBOSE=1` for full logs.
- **Dev-oriented** Docker and CSP: production deployments should tighten `Content-Security-Policy` and restrict `connect-src` to known Jupyter origins.
- Cell HTML outputs are passed through **DOMPurify** in the notebook host (see `components/notebook/output-sanitizer.tsx`). Complex `text/html` widgets that rely on inline scripts may need a dedicated trusted renderer later.

## Stack

- Next.js 16.2 (App Router), React 19.2, TypeScript 5
- Tailwind CSS v4, `next-themes`, Zustand, Lucide
- Jupyter: `@datalayer/jupyter-react`, `@jupyterlab/services`

## Source layout & inline docs

| Area                                                                                 | Role                                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`app/`](app/)                                                                       | Next.js App Router routes (`notebooks`, `strategies`, layouts).                 |
| [`components/`](components/)                                                         | UI: workbench shell, notebook host, strategy editor, sidebars.                  |
| [`lib/env.ts`](lib/env.ts)                                                           | Public env helpers for Jupyter URLs, token, notebook/strategy roots, user home. |
| [`lib/jupyter-contents.ts`](lib/jupyter-contents.ts)                                 | Notebook tree CRUD via Jupyter Contents API.                                    |
| [`lib/strategy-contents.ts`](lib/strategy-contents.ts)                               | Strategy packages and files via Contents API.                                   |
| [`lib/jupyter-paths.ts`](lib/jupyter-paths.ts)                                       | Path normalization and safety checks for contents paths.                        |
| [`lib/jupyter-service-manager-context.tsx`](lib/jupyter-service-manager-context.tsx) | Shared `ServiceManager` React context.                                          |
| [`lib/use-strategy-path-injection.ts`](lib/use-strategy-path-injection.ts)           | Kernel `sys.path` injection for strategies.                                     |

Public TypeScript APIs use **JSDoc** (`@param`, `@returns`, `@remarks` where it helps). Security detail remains in [SECURITY.md](SECURITY.md).
