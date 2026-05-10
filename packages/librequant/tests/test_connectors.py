"""Tests for market data connectors (mocked external APIs)."""

from unittest.mock import patch

import pandas as pd
import pytest

from librequant.data.connectors.alpaca import fetch_alpaca_bars
from librequant.data.connectors.polygon import fetch_polygon_bars
from librequant.data.connectors.tiingo import fetch_tiingo_bars
from librequant.data.connectors.yfinance import fetch_yfinance_bars


def test_fetch_alpaca_without_keys_raises() -> None:
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(ValueError, match="ALPACA_API_KEY"):
            fetch_alpaca_bars(
                "AAPL",
                pd.Timestamp("2020-01-02"),
                pd.Timestamp("2020-01-05"),
                "1d",
            )


def test_fetch_polygon_not_implemented() -> None:
    with pytest.raises(NotImplementedError, match="Polygon"):
        fetch_polygon_bars(
            "AAPL",
            pd.Timestamp("2020-01-02"),
            pd.Timestamp("2020-01-05"),
            "1d",
        )


def test_fetch_tiingo_not_implemented() -> None:
    with pytest.raises(NotImplementedError, match="Tiingo"):
        fetch_tiingo_bars(
            "AAPL",
            pd.Timestamp("2020-01-02"),
            pd.Timestamp("2020-01-05"),
            "1d",
        )


def test_fetch_yfinance_empty_download() -> None:
    with patch("yfinance.download", return_value=pd.DataFrame()):
        out = fetch_yfinance_bars(
            "AAPL",
            pd.Timestamp("2020-01-02"),
            pd.Timestamp("2020-01-05"),
            "1d",
        )
    assert out.empty


def test_fetch_yfinance_multiindex_columns_flattened() -> None:
    idx = pd.date_range("2020-01-02", periods=2, freq="D")
    raw = pd.DataFrame(
        [[1.0, 1.1, 0.9, 1.0, 100.0]] * 2,
        index=idx,
        columns=pd.MultiIndex.from_tuples(
            [
                ("AAPL", "Open"),
                ("AAPL", "High"),
                ("AAPL", "Low"),
                ("AAPL", "Close"),
                ("AAPL", "Volume"),
            ]
        ),
    )
    with patch("yfinance.download", return_value=raw):
        out = fetch_yfinance_bars(
            "AAPL",
            pd.Timestamp("2020-01-02"),
            pd.Timestamp("2020-01-03"),
            "1d",
        )
    assert list(out.columns) == ["open", "high", "low", "close", "volume"]
    assert len(out) == 2
