# 📈 LibreQuant

**The Open-Source Workbench for Algorithmic Alpha.**

LibreQuant is a local-first, reactive research environment designed to bridge the gap between fragmented Python research (Jupyter) and production-ready execution infrastructure.

Designed for the "Data-First" Quant, LibreQuant uses Abstract Syntax Tree (AST) discovery to turn static Python strategy files into dynamic, interactive workbanks in under 100ms.

[Project Page](https://TomPCurran.github.io/LibreQuant/) | [App developer docs](librequant/README.md) | [Discord](#) | [License: MIT](LICENSE)

---

## Developers

The Next.js workbench lives in **`librequant/`**. For setup (Jupyter via Docker, env vars, scripts, application routes, source layout, and Jupyter integration overview), see **[`librequant/README.md`](librequant/README.md)** — that file is the canonical guide for building and running the app.

**Documentation index**

| Topic | Location |
| ----- | -------- |
| Install, `dev:stack`, configuration, routes, codebase map | [`librequant/README.md`](librequant/README.md) |
| Threat model, Jupyter token, network exposure | [`librequant/SECURITY.md`](librequant/SECURITY.md) |
| Environment variables (template) | [`librequant/.env.example`](librequant/.env.example) |
| TypeScript module docs | JSDoc on `librequant/lib/**/*.ts` and key `components/` entry points |

---

## 💎 The Philosophy

Traditional trading platforms are often "black boxes" or fragmented scripts. LibreQuant is built on three core pillars inspired by modern Data Science workflows:

1.  **Reactive Research:** Don't just run backtests; "sculpt" your strategy. Parameters are automatically discovered and mapped to UI controls.
2.  **Zero-Trust Locality:** Your alpha is your moat. LibreQuant runs entirely in your local Docker environment. Your strategies, data, and API keys never leave your machine.
3.  **Workflow Ownership:** A unified interface for the entire lifecycle: **Idea → Backtest → Live Deployment → Monitoring.**

---

## 🚀 Quick Start (Docker)

The fastest way to get the **LibreQuant** workbench running locally is from the `librequant/` app directory: `npm run dev:stack` starts Jupyter (Docker) and Next together. The app is **local-first**; see [`librequant/SECURITY.md`](librequant/SECURITY.md) for Jupyter token handling and network exposure.

```bash
git clone https://github.com/TomPCurran/LibreQuant.git
cd LibreQuant/librequant
npm install
npm run dev:stack
```

This uses [`librequant/docker-compose.yml`](librequant/docker-compose.yml) and creates `.env.local` from `.env.example` when missing. For manual steps and full configuration, read [`librequant/README.md`](librequant/README.md).
