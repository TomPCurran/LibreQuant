"""Tests for OHLCV bar loading and cache behavior."""

import os
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest

from librequant.data.bars import get_bars
from librequant.data.cache import cache_paths, write_meta


@pytest.fixture
def tmp_data_root(tmp_path: Path) -> Path:
    root = tmp_path / "data"
    root.mkdir()
    with patch.dict(
        os.environ,
        {"LIBREQUANT_DATA_ROOT": str(root), "JUPYTER_USER_HOME": str(tmp_path)},
        clear=False,
    ):
        yield root


def _ohlcv_df(idx: pd.DatetimeIndex) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "open": 1.0,
            "high": 1.1,
            "low": 0.9,
            "close": 1.0,
            "volume": 100.0,
        },
        index=idx,
    )


def test_get_bars_empty_fetcher_returns_empty(tmp_data_root: Path) -> None:
    def empty_fetch(
        symbol: str,
        start: pd.Timestamp,
        end: pd.Timestamp,
        interval: str,
    ) -> pd.DataFrame:
        return pd.DataFrame()

    with patch(
        "librequant.data.bars._SOURCE_FETCH",
        {
            "yfinance": empty_fetch,
            "alpaca": empty_fetch,
            "polygon": empty_fetch,
            "tiingo": empty_fetch,
        },
    ):
        out = get_bars("AAPL", "2020-01-02", "2020-01-05", source="yfinance")
        assert out.empty


def test_get_bars_missing_ohlcv_raises(tmp_data_root: Path) -> None:
    def bad_fetch(
        symbol: str,
        start: pd.Timestamp,
        end: pd.Timestamp,
        interval: str,
    ) -> pd.DataFrame:
        idx = pd.date_range("2020-01-02", "2020-01-05", freq="D")
        return pd.DataFrame({"open": 1.0}, index=idx)

    with patch(
        "librequant.data.bars._SOURCE_FETCH",
        {"yfinance": bad_fetch, "alpaca": bad_fetch, "polygon": bad_fetch, "tiingo": bad_fetch},
    ):
        with pytest.raises(ValueError, match="missing column"):
            get_bars("AAPL", "2020-01-02", "2020-01-05", source="yfinance")


def test_get_bars_invalid_source_raises(tmp_data_root: Path) -> None:
    with pytest.raises(ValueError, match="Unknown source"):
        get_bars("AAPL", "2020-01-02", "2020-01-05", source="not-a-source")


def test_get_bars_start_after_end_raises(tmp_data_root: Path) -> None:
    with pytest.raises(ValueError, match="start must be on or before"):
        get_bars("AAPL", "2020-01-10", "2020-01-02", source="yfinance")


def test_get_bars_gap_fill_fetches_edges(tmp_data_root: Path) -> None:
    calls: list[tuple[pd.Timestamp, pd.Timestamp]] = []

    def fake_fetch(
        symbol: str,
        start: pd.Timestamp,
        end: pd.Timestamp,
        interval: str,
    ) -> pd.DataFrame:
        calls.append((start.normalize(), end.normalize()))
        idx = pd.date_range(start, end, freq="D")
        return _ohlcv_df(idx)

    cached_idx = pd.date_range("2020-01-05", "2020-01-10", freq="D")
    cached = _ohlcv_df(cached_idx)
    pq_path, meta_path = cache_paths("yfinance", "AAPL", "1d")
    pq_path.parent.mkdir(parents=True, exist_ok=True)
    cached.to_parquet(pq_path)
    write_meta(
        meta_path,
        {
            "min_ts": "2020-01-05T00:00:00",
            "max_ts": "2020-01-10T00:00:00",
        },
    )

    with patch(
        "librequant.data.bars._SOURCE_FETCH",
        {"yfinance": fake_fetch, "alpaca": fake_fetch, "polygon": fake_fetch, "tiingo": fake_fetch},
    ):
        out = get_bars("AAPL", "2020-01-03", "2020-01-12", source="yfinance")

    assert len(calls) == 2
    assert calls[0][0] == pd.Timestamp("2020-01-03").normalize()
    assert calls[0][1] == pd.Timestamp("2020-01-04").normalize()
    assert calls[1][0] == pd.Timestamp("2020-01-11").normalize()
    assert calls[1][1] == pd.Timestamp("2020-01-12").normalize()
    assert len(out) == 10


def test_get_bars_corrupt_parquet_refetches(
    tmp_data_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[tuple[pd.Timestamp, pd.Timestamp]] = []

    def fake_fetch(
        symbol: str,
        start: pd.Timestamp,
        end: pd.Timestamp,
        interval: str,
    ) -> pd.DataFrame:
        calls.append((start.normalize(), end.normalize()))
        idx = pd.date_range(start, end, freq="D")
        return _ohlcv_df(idx)

    pq_path, _ = cache_paths("yfinance", "SPY", "1d")
    pq_path.parent.mkdir(parents=True, exist_ok=True)
    pq_path.write_bytes(b"not parquet")

    read_parquet = pd.read_parquet

    def flaky_read_parquet(path: object, *args: object, **kwargs: object) -> pd.DataFrame:
        if str(path) == str(pq_path):
            raise OSError("corrupt")
        return read_parquet(path, *args, **kwargs)

    monkeypatch.setattr(pd, "read_parquet", flaky_read_parquet)

    with patch(
        "librequant.data.bars._SOURCE_FETCH",
        {"yfinance": fake_fetch, "alpaca": fake_fetch, "polygon": fake_fetch, "tiingo": fake_fetch},
    ):
        out = get_bars("SPY", "2020-01-02", "2020-01-05", source="yfinance")

    assert len(calls) == 1
    assert not out.empty
