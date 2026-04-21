"""MLflow experiment tracking for backtests (optional ``mlflow`` extra).

Install with ``pip install 'librequant[mlflow]'``. Set ``MLFLOW_TRACKING_URI`` in the environment
(e.g. ``http://mlflow:5000`` in Docker, ``http://127.0.0.1:5000`` on the host).

If logging fails with **403** and *Invalid Host header* on **MLflow 3+**, configure
``MLFLOW_SERVER_ALLOWED_HOSTS`` (merge defaults with ``mlflow`` / ``mlflow:5000``). The bundled
Compose stack pins MLflow 2.x, which does not apply that middleware.

Experiments are created with **proxied** artifact storage (``mlflow-artifacts:/``) so
``log_artifact`` uploads to the tracking server instead of writing ``file:/mlflow/...`` on the
notebook machine. If an old experiment used a server ``file:`` artifact root, deleting it in the
UI only **soft-deletes** it; set ``MLFLOW_BACKEND_STORE_URI`` to the backend store (Compose sets this
for Jupyter) so the library can permanently remove the row and recreate with proxied uploads.

Example:
    >>> from librequant.tracking import backtest_run
    >>>
    >>> with backtest_run(
    ...     strategy="sma_crossover",
    ...     symbol="SPY",
    ...     start="2020-01-01",
    ...     end="2024-01-01",
    ...     params={"fast": 10, "slow": 50},
    ...     tags={"notebook": "research.ipynb"},
    ... ) as run:
    ...     sharpe, mdd, cagr, win_rate = 1.2, 0.1, 0.08, 0.55  # from your backtest
    ...     run.log_metrics(
    ...         {"sharpe": sharpe, "max_drawdown": mdd, "cagr": cagr, "win_rate": win_rate}
    ...     )
    ...     run.set_equity_series(equity_series)
    ...     run.set_returns_series(returns_series)
"""

from __future__ import annotations

import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import TYPE_CHECKING, Any, Iterator

import pandas as pd

if TYPE_CHECKING:
    from mlflow.entities import Experiment
    from mlflow.tracking import MlflowClient

# Param keys aligned with the Next.js API mapper (`symbol`, `start_date`, `end_date`).
PARAM_SYMBOL = "symbol"
PARAM_START_DATE = "start_date"
PARAM_END_DATE = "end_date"

ARTIFACT_EQUITY_CSV = "equity_curve.csv"
ARTIFACT_RETURNS_CSV = "returns_series.csv"

# Proxied artifact root so the client uploads over HTTP instead of writing the server's file: path
# locally (avoids PermissionError on /mlflow when the kernel is not the MLflow container).
_PROXIED_ARTIFACT_LOCATION = "mlflow-artifacts:/"


def _tracking_uri_is_remote() -> bool:
    u = os.environ.get("MLFLOW_TRACKING_URI", "").strip().lower()
    return u.startswith("http://") or u.startswith("https://")


def _file_artifact_incompatible_with_remote_client(exp: Experiment) -> bool:
    return (
        _tracking_uri_is_remote()
        and exp.artifact_location.startswith("file:")
        and "mlflow-artifacts" not in exp.artifact_location
    )


def _permanently_reset_experiment_for_proxied_artifacts(
    client: MlflowClient,
    experiment_name: str,
    exp: Experiment,
) -> None:
    """Drop soft-deleted or active experiments that still reserve the name with a bad file: root."""
    from mlflow.entities import LifecycleStage, ViewType
    from mlflow.tracking import _get_store

    backend = os.environ.get("MLFLOW_BACKEND_STORE_URI", "").strip()
    if not backend:
        raise ValueError(
            f"Experiment {experiment_name!r} still exists (including soft-deleted) with "
            f"artifact_location={exp.artifact_location!r}. The MLflow UI delete is a soft delete: "
            "the name stays taken until a permanent removal. Set MLFLOW_BACKEND_STORE_URI to your "
            "tracking backend store (same value as the MLflow server, e.g. "
            "postgresql://user:pass@host:5432/mlflow), then re-run. "
            "Alternatively run `mlflow gc --backend-store-uri <uri> --experiment-ids <id>` after "
            "`mlflow experiments delete --experiment-id <id>`."
        )
    try:
        store = _get_store(backend)
    except Exception as e:
        err = str(e)
        if "Can't locate revision" in err or "No such revision" in err:
            raise ValueError(
                "MLflow database revision mismatch: the `mlflow` Postgres database was migrated "
                "by a different MLflow major/minor than the Python client. Pin the tracking server "
                "image to the same version as `mlflow` in packages/librequant/pyproject.toml, "
                "rebuild the Jupyter image, and recreate containers. If you previously used "
                "`ghcr.io/mlflow/mlflow:latest` (often v3) with this volume, drop and recreate "
                "only the `mlflow` database (or remove the postgres volume) so v2 can migrate cleanly."
            ) from e
        raise
    hard_run = getattr(store, "_hard_delete_run", None)
    hard_exp = getattr(store, "_hard_delete_experiment", None)
    if not callable(hard_run) or not callable(hard_exp):
        raise ValueError(
            f"Cannot permanently reset experiment {experiment_name!r} on this backend store type. "
            "Use a file- or SQL-backed store, or remove the experiment metadata manually."
        )
    exp_id = str(exp.experiment_id)
    if exp.lifecycle_stage == LifecycleStage.ACTIVE:
        client.delete_experiment(exp_id)
    runs = client.search_runs(
        experiment_ids=[exp_id],
        filter_string="",
        run_view_type=ViewType.ALL,
        max_results=50000,
    )
    for run in runs:
        hard_run(run.info.run_id)
    hard_exp(exp_id)
    client.create_experiment(experiment_name, artifact_location=_PROXIED_ARTIFACT_LOCATION)


def ensure_tracked_experiment(experiment_name: str) -> None:
    """Create or validate an experiment for remote tracking with proxied artifact uploads.

    Use from notebooks when starting a run with :func:`mlflow.start_run` (instead of
    :func:`backtest_run`) so artifact roots work from Jupyter inside Docker.
    """
    _ensure_experiment_for_remote_artifacts(experiment_name)


def _ensure_experiment_for_remote_artifacts(experiment_name: str) -> None:
    """Create the experiment with proxied artifacts, or validate an existing one."""
    import mlflow

    client = mlflow.tracking.MlflowClient()
    exp = client.get_experiment_by_name(experiment_name)
    if exp is None:
        client.create_experiment(experiment_name, artifact_location=_PROXIED_ARTIFACT_LOCATION)
    elif _file_artifact_incompatible_with_remote_client(exp):
        _permanently_reset_experiment_for_proxied_artifacts(client, experiment_name, exp)
    mlflow.set_experiment(experiment_name)


def _normalize_date(value: str | pd.Timestamp) -> str:
    """Normalize a bound or Timestamp to an ISO date string for MLflow params."""
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    s = str(value).strip()
    if not s:
        return s
    ts = pd.to_datetime(s, errors="coerce")
    if pd.isna(ts):
        return s
    return pd.Timestamp(ts).date().isoformat()


def _param_value_for_mlflow(value: Any) -> str:
    """Serialize param values for ``mlflow.log_param`` (string-friendly)."""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    return str(value)


class BacktestTracker:
    """Handle metrics and artifact registration inside :func:`backtest_run`."""

    def __init__(self) -> None:
        self._equity: pd.Series | None = None
        self._equity_path: Path | None = None
        self._returns: pd.Series | None = None
        self._returns_path: Path | None = None

    def log_metrics(self, metrics: dict[str, float]) -> None:
        """Log scalar metrics for the active run."""
        import mlflow

        mlflow.log_metrics(metrics)

    def set_equity_series(self, series: pd.Series | Path) -> None:
        """Register the equity curve as a CSV artifact on successful exit."""
        if isinstance(series, Path):
            self._equity_path = series
            self._equity = None
        else:
            self._equity = series
            self._equity_path = None

    def set_returns_series(self, series: pd.Series | Path) -> None:
        """Register the returns series as a CSV artifact on successful exit."""
        if isinstance(series, Path):
            self._returns_path = series
            self._returns = None
        else:
            self._returns = series
            self._returns_path = None

    def _write_series_csv(self, series: pd.Series, dest: Path) -> None:
        out = series.copy()
        out.name = out.name or "value"
        df = out.reset_index()
        df.to_csv(dest, index=False)

    def flush_artifacts(self) -> None:
        """Write temp CSVs and log artifacts. Called by ``backtest_run`` on success only."""
        import mlflow

        with tempfile.TemporaryDirectory(prefix="librequant-mlflow-") as tmp:
            tdir = Path(tmp)

            if self._equity_path is not None:
                mlflow.log_artifact(str(self._equity_path), artifact_path="curves")
            elif self._equity is not None:
                p = tdir / ARTIFACT_EQUITY_CSV
                self._write_series_csv(self._equity, p)
                mlflow.log_artifact(str(p), artifact_path="curves")

            if self._returns_path is not None:
                mlflow.log_artifact(str(self._returns_path), artifact_path="curves")
            elif self._returns is not None:
                p = tdir / ARTIFACT_RETURNS_CSV
                self._write_series_csv(self._returns, p)
                mlflow.log_artifact(str(p), artifact_path="curves")


@contextmanager
def backtest_run(
    *,
    strategy: str,
    symbol: str,
    start: str | pd.Timestamp,
    end: str | pd.Timestamp,
    params: dict[str, Any],
    tags: dict[str, str] | None = None,
) -> Iterator[BacktestTracker]:
    """Run a backtest under an MLflow experiment named ``strategy``.

    On success, logs artifact CSVs registered via the tracker. On exception, the run is marked
    FAILED and the exception is re-raised.

    Args:
        strategy: Experiment name (one experiment per strategy).
        symbol: Underlying symbol (logged as param ``symbol``).
        start: Range start (logged as ``start_date``).
        end: Range end (logged as ``end_date``).
        params: Extra hyperparameters (logged as individual params).
        tags: Optional run tags.

    Yields:
        :class:`BacktestTracker` for metrics and artifact registration.
    """
    import mlflow

    _ensure_experiment_for_remote_artifacts(strategy)
    mlflow.start_run()
    tracker = BacktestTracker()
    try:
        mlflow.log_param(PARAM_SYMBOL, symbol)
        mlflow.log_param(PARAM_START_DATE, _normalize_date(start))
        mlflow.log_param(PARAM_END_DATE, _normalize_date(end))
        for key, val in params.items():
            mlflow.log_param(str(key), _param_value_for_mlflow(val))
        if tags:
            mlflow.set_tags(tags)
        yield tracker
    except BaseException:
        mlflow.end_run(status="FAILED")
        raise
    else:
        tracker.flush_artifacts()
        mlflow.end_run(status="FINISHED")
