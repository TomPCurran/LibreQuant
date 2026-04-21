# 📈 LibreQuant

**The Open-Source Workbench for Algorithmic Alpha.**

LibreQuant is a local-first, reactive research environment designed to bridge the gap between fragmented Python research (Jupyter) and production-ready execution infrastructure.

Designed for the "Data-First" Quant, LibreQuant uses Abstract Syntax Tree (AST) discovery to turn static Python strategy files into dynamic, interactive workbanks in under 100ms.

[Project Page](https://TomPCurran.github.io/LibreQuant/) | [App developer docs](librequant/README.md) | [License: MIT](LICENSE)

---

## Repository layout

| Path | Role |
| ---- | ---- |
| [`librequant/`](librequant/) | Next.js App Router workbench (UI, API routes, Jupyter client) |
| [`packages/librequant/`](packages/librequant/) | Installable Python package: market data, Parquet cache, optional Postgres and MLflow helpers |
| [`docker-compose.yml`](docker-compose.yml) | Local stack: **PostgreSQL**, **MLflow** (tracking server + artifact store), **Jupyter** (custom image with the Python package pre-baked) |
| [`docker/`](docker/) | Jupyter and MLflow image definitions; Postgres init scripts |

---

## Developers

The Next.js workbench lives in **`librequant/`**. For setup (Docker Compose stack, Jupyter, env vars, scripts, application routes, source layout, and Jupyter integration overview), see **[`librequant/README.md`](librequant/README.md)** — that file is the canonical guide for building and running the app.

**Documentation index**

| Topic | Location |
| ----- | -------- |
| Install, `dev:stack`, production build (`NEXT_PUBLIC_*` at build time), configuration, routes, codebase map | [`librequant/README.md`](librequant/README.md) |
| Python package (`get_bars`, optional Postgres / MLflow extras) | [`packages/librequant/README.md`](packages/librequant/README.md) |
| Threat model, Jupyter token, network exposure | [`librequant/SECURITY.md`](librequant/SECURITY.md) |
| Docker Compose host paths and Postgres / MLflow notes | [`env.docker.example`](env.docker.example) |
| Environment variables (Next + Jupyter template) | [`librequant/.env.example`](librequant/.env.example) |
| TypeScript module docs | JSDoc on `librequant/lib/**/*.ts` and key `components/` entry points |

---

## 💎 The Philosophy

Traditional trading platforms are often "black boxes" or fragmented scripts. LibreQuant is built on three core pillars inspired by modern Data Science workflows:

1.  **Reactive Research:** Don't just run backtests; "sculpt" your strategy. Parameters are automatically discovered and mapped to UI controls.
2.  **Zero-Trust Locality:** Your alpha is your moat. LibreQuant runs entirely in your local Docker environment. Your strategies, data, and API keys never leave your machine.
3.  **Workflow Ownership:** A unified interface for the entire lifecycle: **Idea → Backtest → Live Deployment → Monitoring.**

---

## 🚀 Quick Start (Docker)

The fastest way to get the **LibreQuant** workbench running locally is from the `librequant/` app directory: `npm run dev:stack` runs **`docker compose up -d`** at the repo root (PostgreSQL, MLflow, Jupyter), waits for Jupyter, then starts Next.js. The app is **local-first**; see [`librequant/SECURITY.md`](librequant/SECURITY.md) for Jupyter token handling and network exposure.

```bash
git clone https://github.com/TomPCurran/LibreQuant.git
cd LibreQuant/librequant
npm install
npm run dev:stack
```

Compose publishes **Jupyter** on `127.0.0.1:8888`, **MLflow** on `127.0.0.1:5000`, and **Postgres** on `127.0.0.1:5432` by default (all loopback; see [`env.docker.example`](env.docker.example) to change ports or workspace paths). The script creates `librequant/.env.local` from `.env.example` when missing. For manual steps and full configuration, read [`librequant/README.md`](librequant/README.md).
