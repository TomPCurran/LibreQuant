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

## Application routes

| Route                                                          | Purpose                                                                                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`app/page.tsx`](app/page.tsx)                                 | Home / notebook workbench (`HomeWorkspace`). Opens notebooks via `?path=` query.                                                                            |
| [`app/notebooks/page.tsx`](app/notebooks/page.tsx)             | Notebook library: list and open `.ipynb` files under the Jupyter contents root.                                                                             |
| [`app/strategies/page.tsx`](app/strategies/page.tsx)           | Strategy library browser.                                                                                                                                   |
| [`app/strategies/edit/page.tsx`](app/strategies/edit/page.tsx) | Strategy editor (files under the strategies tree via Contents API).                                                                                         |
| [`app/data-sources/page.tsx`](app/data-sources/page.tsx)       | Data sources: API keys (`.env.local`), uploads, and links to OHLCV cache docs.                                                                              |
| [`app/experiments/page.tsx`](app/experiments/page.tsx)         | MLflow experiments: browse runs; selection is shareable via `?experiment=` (see [`.env.example`](.env.example) for `NEXT_PUBLIC_MLFLOW_UI_URL` vs Compose). |
| [`app/documentation/page.tsx`](app/documentation/page.tsx)     | In-app documentation (notebooks, data sources, strategies, workspace).                                                                                        |

Layouts and global UI: [`app/layout.tsx`](app/layout.tsx) (fonts, theme, skip link); client providers in [`components/providers.tsx`](components/providers.tsx) (`JupyterReachabilityStack`).

## Prerequisites

- Node.js 20+
- Docker (for the bundled Jupyter Server)

## Configuration

Copy [`.env.example`](.env.example) to `.env.local` and adjust (or rely on `predev` / `prebuild`, which create `.env.local` from `.env.example` when it is missing). Variables are documented inline in `.env.example`; the important ones:

| Variable                                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_JUPYTER_BASE_URL`          | Jupyter Server HTTP origin (no trailing slash), e.g. `http://127.0.0.1:8888`. Prefer **127.0.0.1** with Docker’s default port map (`127.0.0.1:8888`); `localhost` can resolve to IPv6 first on macOS and fail while the server listens on IPv4 only. The app normalizes `localhost` → `127.0.0.1` for this URL.                                                                                                      |
| `NEXT_PUBLIC_JUPYTER_TOKEN`             | Login token for Jupyter; must match the server (e.g. Docker `JUPYTER_TOKEN`). **Treat as a password** — it is exposed to the browser.                                                                                                                                                                                                                                                                                |
| `NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT`     | Contents path for the notebook library relative to Jupyter root (default `work/librequant`).                                                                                                                                                                                                                                                                                                                         |
| `NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH` | Default assumes Docker’s `PYTHONPATH` (Compose stack). Set to `0` only to force browser `sys.path` injection (e.g. Jupyter without matching `PYTHONPATH`). If you change `NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT` or `NEXT_PUBLIC_JUPYTER_USER_HOME`, update the `PYTHONPATH` line in the repository root `docker-compose.yml` so it matches `getJupyterUserHomeAbsolute()` + `getStrategyLibraryRoot()` in `lib/env.ts`. |
| `NEXT_PUBLIC_JUPYTER_USER_HOME`         | Absolute Linux home inside the container for kernel snippets that join paths (default `/home/jovyan`).                                                                                                                                                                                                                                                                                                               |
| `NEXT_PUBLIC_MLFLOW_UI_URL`             | HTTP origin for the embedded MLflow UI iframe and CSP `frame-src` (default `http://127.0.0.1:5000`). Must match the MLflow service port published in the repository root `docker-compose.yml`. Documented with operator notes in [`.env.example`](.env.example).                                                                                                                                                     |
| `NEXT_PUBLIC_MLFLOW_EXPERIMENTS_POLL_MS` | Optional. How often the app polls the MLflow experiments list in the sidebar/explorer (default `12000` ms). Lower values refresh sooner but increase network churn; minimum `1000`. See [`.env.example`](.env.example).                                                                                                                                                                                                                                                               |
| `NEXT_PUBLIC_JUPYTER_VERBOSE`           | Set to `1` to disable dev log filtering in `lib/jupyter-dev-noise.ts`.                                                                                                                                                                                                                                                                                                                                               |
| `ALPACA_API_KEY` / `ALPACA_SECRET_KEY`  | Server-only and Jupyter: Alpaca Market Data (see [`packages/librequant`](../packages/librequant)). Set in `.env.local`; never commit.                                                                                                                                                                                                                                                                                |
| `POLYGON_API_KEY` / `TIINGO_API_KEY`    | Reserved for future connectors; same rules as above.                                                                                                                                                                                                                                                                                                                                                                 |

Runtime resolution and validation live in [`lib/env.ts`](lib/env.ts) (JSDoc on each export).

## Data sources and `librequant.data`

The Python package at [`packages/librequant`](../packages/librequant) is bind-mounted into the Jupyter container (`/opt/librequant`) and installed on container start (`pip install /opt/librequant`). In notebooks you can use:

```python
from librequant.data import get_bars
df = get_bars("AAPL", "2020-01-01", "2024-01-01", source="yfinance")
```

**OHLCV cache:** Parquet files under `data/cache/ohlcv/` inside the Jupyter workspace volume (default `…/work/librequant/data/cache/ohlcv/`). Repeated requests for the same range are served from cache without re-downloading.

**Credentials:** Add API keys to **`librequant/.env.local`** (gitignored) or use the Data sources page (built-in providers plus **custom** uppercase env names, e.g. `MY_DATA_API_KEY`). Saving from the app also **syncs** a `config/credentials.env` file into the Jupyter workspace; `librequant.data` runs `python-dotenv` on each `get_bars()` (and exposes `load_data_source_secrets()`), so you usually **do not need to restart Docker** after changing keys. The repository root [`docker-compose.yml`](../docker-compose.yml) can still pass optional `env_file` from `.env.local` into Jupyter for the initial process environment; the synced file overrides on each data call (`override=True`).

## Jupyter Server (Docker)

**Scope:** This stack is **local-only** — a browser on your machine talking to Jupyter on **localhost**. It is not intended for public or multi-tenant deployment without additional hardening. See [SECURITY.md](SECURITY.md) for the threat model.

From the **repository root** (parent of `librequant/`):

```bash
docker compose up
```

This starts the full Compose stack defined in [`docker-compose.yml`](../docker-compose.yml):

| Service | Role |
| ------- | ---- |
| **`postgres`** | PostgreSQL 17; database `librequant` for app data, plus logical database `mlflow` for MLflow’s backend store (see [`docker/postgres/`](../docker/postgres/)). |
| **`mlflow-db-init`** | One-shot job: ensures the `mlflow` database exists when reusing an older volume (init scripts only run on first cluster init). |
| **`mlflow`** | MLflow tracking server (API + UI) on **127.0.0.1:5000**; artifacts under a Docker volume; version pinned to match the Python client in [`pyproject.toml`](../packages/librequant/pyproject.toml). |
| **`jupyter`** | Custom image **`librequant-jupyter:local`** built from [`docker/jupyter/Dockerfile`](../docker/jupyter/Dockerfile) (based on `quay.io/jupyter/scipy-notebook`, with `packages/librequant` dependency pins pre-installed in the image). The running container bind-mounts `./packages/librequant` at `/opt/librequant` and on each start runs `pip install '/opt/librequant[postgres,mlflow]'` so local edits to the package are picked up quickly. |

**Jupyter container behavior:**

- **`librequant` Python package** — mount at `/opt/librequant` plus editable install on start so `import librequant.data` works in notebooks. Heavy dependencies are pre-baked in the image; the start-time `pip install` is meant to stay fast when wheels match [`pyproject.toml`](../packages/librequant/pyproject.toml).
- **`PYTHONPATH`** includes `/home/jovyan/work/librequant/strategies` so notebook kernels see strategy packages without per-load `executeCode` (keep in sync with `NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT` / `NEXT_PUBLIC_JUPYTER_USER_HOME` if you change them). The Compose command ensures that directory exists before Jupyter starts.
- Port **8888** bound to **127.0.0.1** on the host (not advertised on the LAN from Docker’s port mapping).
- Token **`devtoken`** (`NEXT_PUBLIC_JUPYTER_TOKEN` must match). **Treat the token like a password** — it is bundled into the client and grants full access to the Jupyter server and its mounted files.
- CORS for the Next dev origins and **`Access-Control-Allow-Credentials`** (required because `@jupyterlab/services` uses credentialed fetch).
- **XSRF checks disabled** on Jupyter (`ServerApp.disable_check_xsrf`) because the app (`http://localhost:3000`) and Jupyter (`http://localhost:8888`) are different origins; the token and restricted CORS still apply. Acceptable for local dev; **do not expose port 8888 to untrusted networks** (see [SECURITY.md](SECURITY.md)).

`npm run dev:stack` runs **`docker compose up -d`** for this full stack, then waits only for Jupyter (port **8888** + HTTP API) before starting Next.js — Postgres and MLflow come up as dependencies of the Jupyter service.

If the app shows “Connecting to Jupyter…” forever, confirm `NEXT_PUBLIC_JUPYTER_TOKEN` matches the container (`devtoken` by default) and restart the app after changing env. An empty token is rejected by Jupyter (403 on `/api/*`).

### Notebook files and persistence

- **Host folder (default):** [`docker-compose.yml`](../docker-compose.yml) bind-mounts a directory on your machine onto **`/home/jovyan/work/librequant`** inside the container. That is the whole LibreQuant workspace: notebooks, `data/uploads/`, `config/credentials.env`, and `strategies/`. By default the repo uses **`./jupyter-workspace`** next to `docker-compose.yml` (gitignored).
- **Choose your own path (e.g. Desktop):** Create a **repo-root** `.env` file (not `librequant/.env.local`) and set:
  - `LIBREQUANT_JUPYTER_WORKSPACE_HOST=/Users/you/Desktop/notebooks`  
    Use an absolute path on macOS so Finder shows your files exactly there. Restart Jupyter (`docker compose up -d` or `npm run dev:stack`) after changing it.
- See [`env.docker.example`](../env.docker.example) for the variable name and examples. Docker Compose reads `.env` from the **repository root** for this substitution only.
- **`NEXT_PUBLIC_JUPYTER_NOTEBOOK_ROOT`** (see [`.env.example`](.env.example)) stays **`work/librequant`** unless you change the app’s path model; it must match the path Jupyter uses inside the container. With the bind mount above, that maps to files at `{LIBREQUANT_JUPYTER_WORKSPACE_HOST}/*.ipynb` on the host (not nested under an extra `librequant` folder on disk—the mount target _is_ the `librequant` workspace).
- **Migrating from the old named volume:** If you previously used Docker volume `jupyter-librequant-work`, copy data out before switching (e.g. run a one-off container with that volume mounted and `cp` to your new host folder), then apply the new `.env` and `docker compose up -d`.

## One command: Jupyter + Next dev

After `npm install`, from this directory:

```bash
npm run dev:stack
```

This runs `docker compose up -d` from the repo root, waits until port **8888** accepts TCP, then until the Jupyter HTTP API responds on **`/api/kernels`**, ensures `.env.local` (via `ensure-env.mjs`), then starts `npm run dev` (Next on **http://localhost:3000**). The home workspace waits for the same HTTP probe before loading the notebook UI. Press **Ctrl+C** to stop the dev server and run `docker compose down` (omit stopping Jupyter with `npm run dev:stack -- --keep-jupyter`). To only start Next (Jupyter already running elsewhere): `npm run dev:stack -- --no-docker`.

**`--no-docker` / external Jupyter:** Either configure the same **`PYTHONPATH`** on that server (absolute path to your strategies root inside the server filesystem) and keep the default (or `NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH=1`), or set `NEXT_PUBLIC_STRATEGIES_VIA_PYTHONPATH=0` so the app uses client-side `sys.path` injection.

## Production build (`npm run build` + `npm run start`)

`NEXT_PUBLIC_*` values are **inlined at `next build` time** into the client bundle. They are not re-read from `.env.local` when you run `npm run start` alone.

1. Set or generate env **before** building: `prebuild` runs [`scripts/ensure-env.mjs`](scripts/ensure-env.mjs) and copies [`.env.example`](.env.example) → `.env.local` when `.env.local` is missing, so defaults apply during `next build`.
2. Run **`npm run build`**, then **`npm run start`** (with Docker Jupyter already up, or use **`npm run prod:stack`** below).
3. After changing any `NEXT_PUBLIC_*` value, run **`npm run build`** again before `npm run start`.

**Convenience:** **`npm run prod`** runs `build` then `start`. **`npm run prod:stack`** runs [`scripts/prod-stack.mjs`](scripts/prod-stack.mjs): ensure env, `docker compose up -d`, wait for Jupyter, `npm run build`, then `npm run start` (same flags as dev stack: `--no-docker`, `--keep-jupyter`).

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

`predev` / `prebuild` run `ensure-env.mjs` (`.env.local` from `.env.example` when missing), then copy JupyterLab theme variable CSS into `public/jupyter/` because Turbopack does not support the `variables.css?raw` import used inside `@datalayer/jupyter-react`’s `JupyterLabCss` (you would otherwise see `[JupyterLabCss] Failed to load theme variables` and a broken editor theme).

Open [http://localhost:3000](http://localhost:3000). The notebook connects to `NEXT_PUBLIC_JUPYTER_BASE_URL` using `NEXT_PUBLIC_JUPYTER_TOKEN` (must match the Jupyter server token).

## Scripts

| Command                 | Description                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev:stack`     | Docker Jupyter + Next dev (recommended locally)                                                                                                |
| `npm run dev`           | Development server                                                                                                                             |
| `npm run build`         | Production build (`prebuild` ensures `.env.local` + theme CSS)                                                                                 |
| `npm run start`         | Start production server                                                                                                                        |
| `npm run prod`          | `npm run build && npm run start`                                                                                                               |
| `npm run prod:stack`    | Docker Jupyter + `build` + `start` (production parity with `dev:stack`)                                                                        |
| `npm run lint`          | ESLint (Next flat config)                                                                                                                      |
| `make prod`             | From **repository root**: `npm ci` + `npm run prod:stack` — Docker Jupyter, production `next build`, `next start` (one command; Ctrl+C stops). |
| `make librequant-build` | From **repository root**: `npm ci` + production `next build` in `librequant/` only.                                                            |
| `make compose-up`       | From **repository root**: `docker compose pull` + `up -d` (full stack: Postgres, MLflow, Jupyter).                                            |
| `make prod-build`       | `librequant-build` + `compose-up` only (no Next server); then `cd librequant && npm start` yourself.                                           |

## Security notes

Full detail: **[SECURITY.md](SECURITY.md)** (trusted machine / trusted browser, Jupyter token sensitivity, XSRF and CORS rationale).

- **React Strict Mode is disabled** in `next.config.ts` so the Jupyter notebook runtime (Yjs + kernel comms) is not torn down twice in development; re-enable only if you accept noisy Yjs / “Comm not found” errors from `@datalayer/jupyter-react`.
- JupyterLab 4’s notebook model always uses **Yjs** (`@jupyter/ydoc`); `collaborative: false` only turns off RTC. Benign Yjs / comm / LabIcon SVG messages in dev are filtered while the notebook is mounted (see `lib/jupyter-dev-noise.ts`); set `NEXT_PUBLIC_JUPYTER_VERBOSE=1` for full logs.
- **Dev-oriented** Docker and CSP: production deployments should tighten `Content-Security-Policy` and restrict `connect-src` to known Jupyter origins.
- Cell HTML outputs are passed through **DOMPurify** in the notebook host (see `components/notebook/output-sanitizer.tsx`). Complex `text/html` widgets that rely on inline scripts may need a dedicated trusted renderer later.

## Stack

- Next.js 16.2.x (App Router), React 19.2, TypeScript 5
- Tailwind CSS v4, `next-themes`, Zustand, Lucide
- Jupyter: `@datalayer/jupyter-react`, `@jupyterlab/services`
- Tests: Vitest (`npm run test`)

## Source layout & architecture

### Directory map

| Path                                               | Role                                                                                                                                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`app/`](app/)                                     | App Router pages, `layout.tsx`, `loading.tsx`, `error.tsx`; API routes under [`app/api/`](app/api/): PyPI search, data-sources credentials/status, MLflow experiments/runs/artifacts (server-side proxy to the tracking server). |
| [`components/`](components/)                       | Feature UI: [`workbench-shell`](components/workbench-shell.tsx), notebook ([`jupyter-workbench`](components/notebook/jupyter-workbench.tsx), toolbar, cells), strategies editor, sidebars, package search.                                         |
| [`lib/`](lib/)                                     | Shared logic: Jupyter integration, env, paths, hooks, stores, lifecycle events.                                                                                                                                                                    |
| [`public/jupyter/`](public/jupyter/)               | Copied JupyterLab theme CSS (`predev` / `prebuild`); required for editor theming with Turbopack.                                                                                                                                                   |
| [`scripts/ensure-env.mjs`](scripts/ensure-env.mjs) | `predev` / `prebuild`: `.env.local` from `.env.example` when missing.                                                                                                                                                                              |
| [`scripts/dev-stack.mjs`](scripts/dev-stack.mjs)   | `npm run dev:stack`: Docker up, TCP + HTTP readiness, then `npm run dev`.                                                                                                                                                                          |
| [`scripts/prod-stack.mjs`](scripts/prod-stack.mjs) | `npm run prod:stack`: same, then `npm run build` + `npm run start`.                                                                                                                                                                                |
| [`docker-compose.yml`](../docker-compose.yml)      | At repository root: Postgres, MLflow, custom Jupyter image, workspace bind mount, loopback ports **5432** / **5000** / **8888** (see [`env.docker.example`](../env.docker.example)).                                                              |
| [`instrumentation.ts`](instrumentation.ts)         | Next.js instrumentation (dev-only noise handling for server sockets).                                                                                                                                                                              |

### Jupyter integration (high level)

1. **`JupyterReachabilityStack`** ([`lib/jupyter-reachability-context.tsx`](lib/jupyter-reachability-context.tsx)) probes the server and wraps **`JupyterServiceManagerProvider`** ([`lib/jupyter-service-manager-context.tsx`](lib/jupyter-service-manager-context.tsx)) — one shared `ServiceManager` for the app.
2. **`JupyterProvider` / session** ([`components/notebook/jupyter-provider.tsx`](components/notebook/jupyter-provider.tsx)) supplies config to `@datalayer/jupyter-react`.
3. **`JupyterWorkbench`** embeds the notebook, wires [`useNotebookServerPersistence`](lib/use-notebook-server-persistence.ts), [`useStrategyPathInjection`](lib/use-strategy-path-injection.ts) (strategy `PYTHONPATH` or fallback `executeCode`), and kernel transport status.
4. **Reset session** — [`notebookClearOutputsAndRestartKernel`](lib/notebook-session-reset.ts) clears outputs, restarts the kernel, waits for WebSocket + idle, emits [`kernel-lifecycle-events`](lib/kernel-lifecycle-events.ts).

Strategy files on disk are managed with [`lib/strategy-contents.ts`](lib/strategy-contents.ts); notebooks with [`lib/jupyter-contents.ts`](lib/jupyter-contents.ts). Path safety and normalization: [`lib/jupyter-paths.ts`](lib/jupyter-paths.ts). All public env resolution: [`lib/env.ts`](lib/env.ts).

### Inline documentation (code)

- TypeScript **public exports** in `lib/` use **JSDoc** (`@param`, `@returns`, `@module`, `@remarks`) where they clarify contracts or security (e.g. path validation for kernel snippets).
- **Notebook / Jupyter** modules include `@module` file headers describing the data flow they participate in.
- Operational and threat-model detail is intentionally kept in **[SECURITY.md](SECURITY.md)**, not duplicated in code comments.

### Related docs

| Document                       | Contents                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| [SECURITY.md](SECURITY.md)     | Jupyter token, CORS, localhost vs 127.0.0.1, CSP notes.      |
| [`.env.example`](.env.example) | Every `NEXT_PUBLIC_*` and Docker token with inline comments. |
| [`packages/librequant/README.md`](../packages/librequant/README.md) | Python package: `get_bars`, optional extras, data cache.     |
| [`env.docker.example`](../env.docker.example) | Repo-root `.env` for Compose: workspace path, Postgres port, MLflow notes. |
