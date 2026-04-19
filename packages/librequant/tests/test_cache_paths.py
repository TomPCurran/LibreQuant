"""Cache path and merge helpers."""

import os
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest

from librequant.data.bars import get_bars
from librequant.data.cache import cache_paths, read_meta, write_meta


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


def test_cache_paths_roundtrip(tmp_data_root: Path) -> None:
    pq, meta = cache_paths("yfinance", "AAPL", "1d")
    assert pq.parent == tmp_data_root / "cache" / "ohlcv"
    write_meta(meta, {"min_ts": "2020-01-01", "max_ts": "2021-01-01"})
    loaded = read_meta(meta)
    assert loaded is not None
    assert loaded["min_ts"] == "2020-01-01"


def test_get_bars_cache_hit_no_second_fetch(tmp_data_root: Path) -> None:
    calls: list[tuple] = []

    def fake_fetch(
        symbol: str,
        start: pd.Timestamp,
        end: pd.Timestamp,
        interval: str,
    ) -> pd.DataFrame:
        calls.append((symbol, start, end, interval))
        idx = pd.date_range("2020-01-02", "2020-01-10", freq="D")
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

    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(tmp_data_root)}, clear=False):
        with patch(
            "librequant.data.bars._SOURCE_FETCH",
            {"yfinance": fake_fetch, "alpaca": fake_fetch, "polygon": fake_fetch, "tiingo": fake_fetch},
        ):
            df1 = get_bars("AAPL", "2020-01-02", "2020-01-05", source="yfinance")
            assert len(calls) == 1
            assert len(df1) >= 1
            df2 = get_bars("AAPL", "2020-01-02", "2020-01-05", source="yfinance")
            assert len(calls) == 1, "second call should be cache hit"
            assert len(df2) == len(df1)
