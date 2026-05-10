"""Tests for MLflow tracking helpers (mlflow mocked)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from librequant.tracking import (
    _normalize_date,
    backtest_run,
    ensure_tracked_experiment,
)


def test_normalize_date_timestamp() -> None:
    ts = pd.Timestamp("2020-06-15")
    assert _normalize_date(ts) == "2020-06-15"


def test_normalize_date_string() -> None:
    assert _normalize_date("2021-01-02") == "2021-01-02"


def test_backtest_run_logs_params_and_metrics() -> None:
    mock_client = MagicMock()
    mock_client.get_experiment_by_name.return_value = None

    log_params: list[tuple[str, str]] = []
    metrics_calls: list[dict[str, float]] = []

    def capture_log_param(key: str, val: str) -> None:
        log_params.append((key, val))

    def capture_metrics(d: dict[str, float]) -> None:
        metrics_calls.append(d)

    with (
        patch("mlflow.tracking.MlflowClient", return_value=mock_client),
        patch("mlflow.log_param", side_effect=capture_log_param),
        patch("mlflow.log_metrics", side_effect=capture_metrics),
        patch("mlflow.start_run"),
        patch("mlflow.end_run"),
        patch("mlflow.set_experiment"),
        patch("mlflow.set_tags"),
    ):
        with backtest_run(
            strategy="sma",
            symbol="SPY",
            start="2020-01-01",
            end="2020-06-01",
            params={"fast": 10},
            tags={"k": "v"},
        ) as run:
            run.log_metrics({"sharpe": 1.5})

    keys = [k for k, _ in log_params]
    assert "symbol" in keys
    assert "start_date" in keys
    assert "end_date" in keys
    assert ("fast", "10") in log_params
    assert metrics_calls == [{"sharpe": 1.5}]


def test_backtest_run_marks_failed_on_exception() -> None:
    mock_client = MagicMock()
    mock_client.get_experiment_by_name.return_value = None
    end_run = MagicMock()

    with (
        patch("mlflow.tracking.MlflowClient", return_value=mock_client),
        patch("mlflow.log_param"),
        patch("mlflow.start_run"),
        patch("mlflow.end_run", end_run),
        patch("mlflow.set_experiment"),
        patch("mlflow.set_tags"),
    ):
        with pytest.raises(RuntimeError, match="boom"):
            with backtest_run(
                strategy="sma",
                symbol="SPY",
                start="2020-01-01",
                end="2020-06-01",
                params={},
            ):
                raise RuntimeError("boom")

    end_run.assert_called_with(status="FAILED")


def test_ensure_tracked_experiment_creates_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000")
    mock_client = MagicMock()
    mock_client.get_experiment_by_name.return_value = None

    with patch("mlflow.tracking.MlflowClient", return_value=mock_client):
        with patch("mlflow.set_experiment"):
            ensure_tracked_experiment("new-exp")

    mock_client.create_experiment.assert_called_once()


def test_ensure_tracked_experiment_file_artifact_triggers_reset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000")
    mock_exp = MagicMock()
    mock_exp.artifact_location = "file:/tmp/old-artifacts"
    mock_exp.experiment_id = "7"

    mock_client = MagicMock()
    mock_client.get_experiment_by_name.return_value = mock_exp

    with (
        patch("mlflow.tracking.MlflowClient", return_value=mock_client),
        patch("mlflow.set_experiment"),
        patch("librequant.tracking._permanently_reset_experiment_for_proxied_artifacts") as reset,
    ):
        ensure_tracked_experiment("legacy-exp")

    reset.assert_called_once()
