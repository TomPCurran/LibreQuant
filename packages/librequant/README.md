# librequant (Python)

Installable package used inside the Jupyter kernel and by local strategies. It provides **market data** (OHLCV with Parquet cache), **credential loading** from `.env` / `config/credentials.env`, and optional **PostgreSQL** and **MLflow** helpers.

## Install

From this directory (or with a path to the package):

```bash
pip install -e ".[postgres,mlflow]"
```

- **`postgres`** — `psycopg` for `read_sql_frame` / `get_database_url` in [`librequant.data.postgres`](librequant/data/postgres.py).
- **`mlflow`** — Pinned client matching the MLflow server in the repo [`docker-compose.yml`](../../docker-compose.yml) (keep versions in sync; see comments there and in [`pyproject.toml`](pyproject.toml)).
- **`dev`** — `pytest`, `ruff`, `mypy` (see `[tool.*]` in [`pyproject.toml`](pyproject.toml)).

In the bundled Docker stack, the Jupyter service **bind-mounts** this tree at `/opt/librequant` and runs `pip install '/opt/librequant[postgres,mlflow]'` on each container start. The image [`docker/jupyter/Dockerfile`](../../docker/jupyter/Dockerfile) pre-installs the same dependency pins so cold starts stay fast.

## Usage

```python
from librequant.data import get_bars

df = get_bars("AAPL", "2020-01-01", "2024-01-01", source="yfinance")
```

**Sources:** `yfinance` and **Alpaca** (with `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` in `librequant/.env.local` or synced credentials) are implemented. **Polygon** and **Tiingo** are registered as sources but raise `NotImplementedError` until their connectors are finished.

**Cache:** Parquet files under `data/cache/ohlcv/` inside the Jupyter workspace (default `…/work/librequant/data/cache/ohlcv/` on the container path).

**Tabular files:** `read_tabular()` for CSV / Excel / Parquet; see [`librequant.data.tabular`](librequant/data/tabular.py).

**Postgres:** Lazy imports `get_database_url` and `read_sql_frame` from `librequant.data.postgres` when the `postgres` extra is installed.

## Documentation

| Topic | Location |
| ----- | -------- |
| Docker `PYTHONPATH`, workspace paths, `credentials.env` sync | [Repository `librequant/README.md`](../../librequant/README.md) |
| Compose, Postgres, MLflow ports and env | [`env.docker.example`](../../env.docker.example) |
| Dependencies and optional extras | [`pyproject.toml`](pyproject.toml) |
