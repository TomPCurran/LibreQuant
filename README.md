# 📈 LibreQuant

**The Open-Source Workbench for Algorithmic Alpha.**

LibreQuant is a local-first, reactive research environment designed to bridge the gap between fragmented Python research (Jupyter) and production-ready execution infrastructure.

Designed for the "Data-First" Quant, LibreQuant uses Abstract Syntax Tree (AST) discovery to turn static Python strategy files into dynamic, interactive workbanks in under 100ms.

[Project Page](https://librequant.github.io/nexus) | [Documentation](#) | [Discord](#) | [License: MIT](LICENSE)

---

## 💎 The Philosophy

Traditional trading platforms are often "black boxes" or fragmented scripts. LibreQuant is built on three core pillars inspired by modern Data Science workflows:

1.  **Reactive Research:** Don't just run backtests; "sculpt" your strategy. Parameters are automatically discovered and mapped to UI controls.
2.  **Zero-Trust Locality:** Your alpha is your moat. LibreQuant runs entirely in your local Docker environment. Your strategies, data, and API keys never leave your machine.
3.  **Workflow Ownership:** A unified interface for the entire lifecycle: **Idea → Backtest → Live Deployment → Monitoring.**

---

## 🚀 Quick Start (Docker)

The fastest way to get LibreQuant running is via our optimized Docker image.

```bash
# Clone the repository
git clone [https://github.com/librequant/nexus.git](https://github.com/librequant/nexus.git)
cd nexus

# Launch the workbench
docker-compose up -d
```
