# Security model (LibreQuant)

This project is intended to run **entirely on a trusted local machine** (developer workstation). It is **not** designed for multi-tenant or public cloud deployment without substantial additional hardening.

## Threat model

- **Trusted machine:** The operator controls the OS, Docker, and browser.
- **Trusted browser:** The user’s browser session is not assumed to be isolated from malicious extensions or shared computers; avoid using LibreQuant on shared or kiosk machines with secrets in the environment.
- **Trusted network (optional):** The default Docker setup binds Jupyter to **host loopback** (`127.0.0.1:8888`) so the Jupyter server is not reachable from other machines on the LAN. Do not remap the port to `0.0.0.0` unless you understand the exposure.

## Sensitive credentials

- **`NEXT_PUBLIC_JUPYTER_TOKEN`** is bundled into the client (required for in-browser Jupyter). Any process that can read the built app or devtools can see it. Treat it like a **password** for the Jupyter server.
- **Do not expose Jupyter’s port (8888) to untrusted networks.** Anyone who can reach the server and guess or obtain the token can execute code in the Jupyter environment and access mounted volumes.

## Jupyter configuration (local dev)

- **XSRF checks are disabled** on the Jupyter server (`ServerApp.disable_check_xsrf`) because the Next.js app (`http://localhost:3000`) and Jupyter (`http://localhost:8888`) are **different origins**, and the client uses credentialed requests with the token. This is a deliberate trade-off for local development together with **CORS** restricted to local dev origins in `docker-compose.yml`.
- **CORS** is limited to localhost / 127.0.0.1 on the dev port; `allow_credentials` is enabled because `@jupyterlab/services` uses credentialed `fetch`.

## Path injection (kernel)

Environment-driven paths used in small Python snippets executed in the kernel are **validated** so values cannot break out of quoted string literals (see `lib/env.ts` and `lib/use-strategy-path-injection.ts`).

## Reporting issues

For security-sensitive reports, prefer private disclosure to the maintainers rather than public issues, especially if a future deployment model adds remote access.
