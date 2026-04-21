"""Register models in the MLflow Model Registry from notebooks (optional ``mlflow`` extra).

Use after logging a model with a standard flavor, e.g. ``mlflow.sklearn.log_model`` or
``mlflow.pyfunc.log_model``, under an active run. The tracking server must use a SQL backend
(Postgres in Compose); the registry shares that store by default.

Example:

    import numpy as np
    import mlflow
    from sklearn.linear_model import LinearRegression
    from librequant.mlflow_registry import register_model_from_run

    X = np.arange(10, dtype=float).reshape(-1, 1)
    y = X.ravel() * 2
    model = LinearRegression().fit(X, y)

    with mlflow.start_run():
        mlflow.sklearn.log_model(model, "model", input_example=X[:5])
        register_model_from_run("my_registered_model", artifact_path="model")
"""

from __future__ import annotations

from typing import Any


def register_model_from_run(
    registered_model_name: str,
    *,
    run_id: str | None = None,
    artifact_path: str = "model",
    await_registration_for: int | None = 300,
) -> Any:
    """Register a model artifact from the active run (or ``run_id``) into the Model Registry.

    Call while an MLflow run is still **active** (before ``end_run``), or pass ``run_id`` from a
    completed run.

    Parameters
    ----------
    registered_model_name
        Registry name (e.g. ``"my_strategy_v1"``). Created if missing.
    run_id
        Defaults to the current active run.
    artifact_path
        Path passed to ``log_model`` (e.g. ``"model"`` for ``log_model(..., "model")``).
    await_registration_for
        Seconds to wait for registration; ``None`` uses MLflow default behavior.

    Returns
    -------
    Model version object from ``mlflow.register_model`` (``ModelVersion`` in MLflow 2.x).
    """
    import mlflow

    rid = run_id
    if rid is None:
        ar = mlflow.active_run()
        if ar is None:
            raise RuntimeError(
                "No active MLflow run. Pass run_id=<uuid>, or call inside "
                "mlflow.start_run() / before a context manager ends the run."
            )
        rid = ar.info.run_id

    raw = (artifact_path.strip() or "model").strip("/")
    ap = raw or "model"
    model_uri = f"runs:/{rid}/{ap}"
    kwargs: dict[str, Any] = {}
    if await_registration_for is not None:
        kwargs["await_registration_for"] = await_registration_for
    return mlflow.register_model(model_uri, registered_model_name, **kwargs)


def register_model_from_uri(
    model_uri: str,
    registered_model_name: str,
    *,
    await_registration_for: int | None = 300,
) -> Any:
    """Register an arbitrary ``models:/`` or ``runs:/`` URI into the Model Registry."""
    import mlflow

    kwargs: dict[str, Any] = {}
    if await_registration_for is not None:
        kwargs["await_registration_for"] = await_registration_for
    return mlflow.register_model(model_uri, registered_model_name, **kwargs)
