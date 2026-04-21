# Security model (LibreQuant)

This project is intended to run **entirely on a trusted local machine** (developer workstation). It is **not** designed for multi-tenant or public cloud deployment without substantial additional hardening.

## Threat model

- **Trusted machine:** The operator controls the OS, Docker, and browser.
- **Trusted browser:** The user’s browser session is not assumed to be isolated from malicious extensions or shared computers; avoid using LibreQuant on shared or kiosk machines with secrets in the environment.
- **Trusted network (optional):** The default Docker setup binds Jupyter to **host loopback** (`127.0.0.1:8888`) so the Jupyter server is not reachable from other machines on the LAN. Do not remap the port to `0.0.0.0` unless you understand the exposure.
- **PostgreSQL (optional Docker service):** The default Compose file publishes Postgres on **host loopback** (`127.0.0.1:5432` by default; override with `POSTGRES_HOST_PORT` in repo-root `.env` if that port is already taken) so SQL clients on the same machine can connect; it is not advertised on the LAN by default. The bootstrap database user is a **PostgreSQL superuser**, which is appropriate for **local development on a trusted machine** only. Do not bind Postgres to `0.0.0.0` or expose it to untrusted networks without replacing superuser access with least-privilege roles and network controls. Compose uses **default** dev credentials (`librequant` / `librequant`) unless you override `POSTGRES_USER` / `POSTGRES_PASSWORD` in repo-root `.env` (gitignored).

## Sensitive credentials

- **`NEXT_PUBLIC_JUPYTER_TOKEN`** is bundled into the client (required for in-browser Jupyter). Any process that can read the built app or devtools can see it. Treat it like a **password** for the Jupyter server.
- **Do not expose Jupyter’s port (8888) to untrusted networks.** Anyone who can reach the server and guess or obtain the token can execute code in the Jupyter environment and access mounted volumes.

## Next.js server and Data sources API

- The **Next.js dev server** (default `http://localhost:3000`) serves the app and **Route Handlers** under `app/api/`, including **`POST /api/data-sources/credentials`** (writes API keys into `librequant/.env.local` on the machine running Next.js) and **`GET /api/data-sources/status`** (non-secret presence flags and custom env key names).
- These endpoints have **no authentication layer** beyond whatever can reach the HTTP port. The same **trusted local machine** assumption applies: anyone who can open the app or send HTTP to that port can change stored credentials. For typical development, bind Next.js to **loopback** (e.g. `127.0.0.1`) if you need to reduce exposure on a shared LAN; do not expose this stack to untrusted networks without adding explicit auth and hardening.

## MLflow API proxy (`/api/mlflow/*`)

- **What it does:** Next.js Route Handlers under **`/api/mlflow/*`** perform server-side `fetch` calls to the MLflow Tracking REST API at **`MLFLOW_TRACKING_URI`** (or **`MLFLOW_API_BASE_URL`**) as resolved by `getMlflowServerBaseUrl()` in `lib/mlflow-server.ts`. There is **no session, user, or app-level authentication** on these routes—the same trust boundary as **`/api/data-sources/*`**.
- **Capabilities:** Depending on MLflow’s own behavior, callers who can reach the Next.js port may list experiments and runs, read artifact metadata and proxied artifact bytes, and **`PATCH /api/mlflow/runs/[runId]`** forwards arbitrary tag key/value pairs to MLflow’s **`runs/update`**. Anyone who can invoke that endpoint can mutate run tags **if the MLflow server allows it** (same as calling MLflow directly).
- **Remote exposure:** If the Next.js app is reachable from beyond a **trusted** host (e.g. wide LAN, VPN, or the public internet), this becomes **arbitrary access to MLflow through Next.js** unless you add network controls, reverse-proxy authentication, and MLflow-side restrictions. The product assumes **local-only** use on a trusted machine; bind Next.js to **loopback** when you need to limit who can hit the API.
- **Optional guard:** Set **`MLFLOW_PROXY_REQUIRE_LOOPBACK=1`** in the environment where Next.js runs to return **403** for `/api/mlflow/*` when the incoming request appears to originate from a **non-loopback** address (based on `X-Forwarded-For` / `X-Real-IP` when present). This is **best-effort**: it does not replace proper auth; behind a trusted reverse proxy you may need to leave this unset or rely on the proxy to strip or set forwarding headers correctly.

## Jupyter configuration (local dev)

- **XSRF checks are disabled** on the Jupyter server (`ServerApp.disable_check_xsrf`) because the Next.js app (`http://localhost:3000`) and Jupyter (`http://localhost:8888`) are **different origins**, and the client uses credentialed requests with the token. This is a deliberate trade-off for local development together with **CORS** restricted to local dev origins in `docker-compose.yml`.
- **CORS** is limited to localhost / 127.0.0.1 on the dev port; `allow_credentials` is enabled because `@jupyterlab/services` uses credentialed `fetch`.
- **Token in the URL (server-side sync):** When the Next.js server writes `config/credentials.env` via Jupyter’s Contents API (`lib/jupyter-sync-secrets.ts`), it passes the Jupyter token as a **query parameter**, which matches common Jupyter Server usage. **Reverse proxies, HTTP access logs, or debug logging** that records full request URLs may capture that token. Prefer loopback for Jupyter in local dev; avoid logging full upstream URLs in any deployment that routes this traffic through a proxy.

## Path injection (kernel)

Environment-driven paths used in small Python snippets executed in the kernel are **validated** so values cannot break out of quoted string literals (see `lib/env.ts` and `lib/use-strategy-path-injection.ts`).

## Reporting issues

For security-sensitive reports, prefer private disclosure to the maintainers rather than public issues, especially if a future deployment model adds remote access.
