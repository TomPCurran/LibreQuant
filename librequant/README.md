# LibreQuant Nexus

Browser-based quantitative research workbench: Next.js App Router shell with [`@datalayer/jupyter-react`](https://www.npmjs.com/package/@datalayer/jupyter-react) talking to a local Jupyter Server over the standard Jupyter protocol (WebSockets + REST).

## Prerequisites

- Node.js 20+
- Docker (for the bundled Jupyter Server)

## Jupyter Server (Docker)

From this directory:

```bash
docker compose up
```

This starts `quay.io/jupyter/scipy-notebook` on port **8888** with token **`devtoken`**, CORS for the Next dev origins, **`Access-Control-Allow-Credentials`** (required because `@jupyterlab/services` uses credentialed fetch), and XSRF checks relaxed for cross-origin token API calls (dev only).

If the app shows “Connecting to Jupyter…” forever, confirm `NEXT_PUBLIC_JUPYTER_TOKEN` matches the container (`devtoken` by default) and restart the app after changing env. An empty token is rejected by Jupyter (403 on `/api/*`).

## One command: Jupyter + Next dev

After `npm install`, from this directory:

```bash
npm run dev:stack
```

This runs `docker compose up -d`, waits until port **8888** accepts connections, creates `.env.local` from `.env.example` if it is missing, then starts `npm run dev` (Next on **http://localhost:3000**). Press **Ctrl+C** to stop the dev server and run `docker compose down` (omit stopping Jupyter with `npm run dev:stack -- --keep-jupyter`). To only start Next (Jupyter already running elsewhere): `npm run dev:stack -- --no-docker`.

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

| Command      | Description              |
| ------------ | ------------------------ |
| `npm run dev:stack` | Docker Jupyter + Next dev (recommended locally) |
| `npm run dev`    | Development server       |
| `npm run build`  | Production build         |
| `npm run start`  | Start production server  |
| `npm run lint`   | ESLint (Next flat config) |

## Security notes

- **React Strict Mode is disabled** in `next.config.ts` so the Jupyter notebook runtime (Yjs + kernel comms) is not torn down twice in development; re-enable only if you accept noisy Yjs / “Comm not found” errors from `@datalayer/jupyter-react`.
- JupyterLab 4’s notebook model always uses **Yjs** (`@jupyter/ydoc`); `collaborative: false` only turns off RTC. Benign Yjs / comm / LabIcon SVG messages in dev are filtered while the notebook is mounted (see `lib/jupyter-dev-noise.ts`); set `NEXT_PUBLIC_JUPYTER_VERBOSE=1` for full logs.
- **Dev-oriented** Docker and CSP: production deployments should tighten `Content-Security-Policy` and restrict `connect-src` to known Jupyter origins.
- Cell HTML outputs are passed through **DOMPurify** in the notebook host (see `components/notebook/output-sanitizer.tsx`). Complex `text/html` widgets that rely on inline scripts may need a dedicated trusted renderer later.

## Stack

- Next.js 16.2 (App Router), React 19.2, TypeScript 5
- Tailwind CSS v4, `next-themes`, Zustand, Lucide
- Jupyter: `@datalayer/jupyter-react`, `@jupyterlab/services`
