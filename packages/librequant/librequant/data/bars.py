"""OHLCV bars with Parquet cache."""

from __future__ import annotations

from typing import Callable

import pandas as pd

from librequant.data.cache import cache_paths, read_meta, write_meta, write_parquet_atomic
from librequant.data.credential_env import load_data_source_secrets
from librequant.data.connectors.alpaca import fetch_alpaca_bars
from librequant.data.connectors.polygon import fetch_polygon_bars
from librequant.data.connectors.tiingo import fetch_tiingo_bars
from librequant.data.connectors.yfinance import fetch_yfinance_bars

Fetcher = Callable[[str, pd.Timestamp, pd.Timestamp, str], pd.DataFrame]

_SOURCE_FETCH: dict[str, Fetcher] = {
    "yfinance": fetch_yfinance_bars,
    "alpaca": fetch_alpaca_bars,
    "polygon": fetch_polygon_bars,
    "tiingo": fetch_tiingo_bars,
}


def _normalize_bars_index(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize to timezone-naive DatetimeIndex so cache hits compare reliably across providers."""
    if df.empty:
        return df
    idx = pd.to_datetime(df.index, utc=False)
    if getattr(idx, "tz", None) is not None:
        idx = idx.tz_convert(None)
    out = df.copy()
    out.index = idx
    return out


def _normalize_source(source: str) -> str:
    s = source.strip().lower()
    if s not in _SOURCE_FETCH:
        raise ValueError(
            f"Unknown source {source!r}. Expected one of: {', '.join(sorted(_SOURCE_FETCH))}."
        )
    return s


def get_bars(
    symbol: str,
    start: str | pd.Timestamp,
    end: str | pd.Timestamp,
    *,
    source: str = "yfinance",
    interval: str = "1d",
) -> pd.DataFrame:
    """
    Load OHLCV bars for ``symbol`` between ``start`` and ``end`` (inclusive by date).

    Uses a Parquet cache under the data root (``cache/ohlcv/``) to avoid redundant downloads.
    On a cache hit for the requested range, no network calls are made.

    Parameters
    ----------
    symbol
        Ticker symbol, e.g. ``"AAPL"``.
    start, end
        Start and end dates (strings ``YYYY-MM-DD`` or pandas timestamps).
    source
        ``"yfinance"``, ``"alpaca"``, ``"polygon"``, or ``"tiingo"``. Polygon and Tiingo raise
        ``NotImplementedError`` until their connectors are added.
    interval
        Interval passed to the provider (default ``1d``).

    Returns
    -------
    pandas.DataFrame
        Columns ``open``, ``high``, ``low``, ``close``, ``volume``; DatetimeIndex.
    """
    load_data_source_secrets()

    src = _normalize_source(source)
    fetcher = _SOURCE_FETCH[src]
    sym = symbol.strip().upper()
    if not sym:
        raise ValueError("symbol must be non-empty.")

    req_start = pd.Timestamp(start).normalize()
    req_end = pd.Timestamp(end).normalize()
    if req_start > req_end:
        raise ValueError("start must be on or before end.")

    pq_path, meta_path = cache_paths(src, sym, interval)
    existing: pd.DataFrame | None = None
    if pq_path.is_file():
        try:
            existing = pd.read_parquet(pq_path)
            existing.index = pd.to_datetime(existing.index)
            existing = _normalize_bars_index(existing)
        except Exception:
            # OSError, corrupt Parquet/Arrow, or bad index: refetch (cache is best-effort).
            existing = None

    meta_d = read_meta(meta_path)
    ex_min: pd.Timestamp | None = None
    ex_max: pd.Timestamp | None = None
    if meta_d and "min_ts" in meta_d and "max_ts" in meta_d:
        ex_min = pd.Timestamp(meta_d["min_ts"]).normalize()
        ex_max = pd.Timestamp(meta_d["max_ts"]).normalize()
    elif existing is not None and not existing.empty:
        ex_min = pd.Timestamp(existing.index.min()).normalize()
        ex_max = pd.Timestamp(existing.index.max()).normalize()

    if (
        existing is not None
        and not existing.empty
        and ex_min is not None
        and ex_max is not None
        and ex_min <= req_start
        and ex_max >= req_end
    ):
        out = existing.loc[(existing.index >= req_start) & (existing.index <= req_end)]
        return _ensure_ohlcv_columns(out.copy())

    fetches: list[pd.DataFrame] = []
    if existing is not None and not existing.empty and ex_min is not None and ex_max is not None:
        if req_start < ex_min:
            left_end = min(req_end, ex_min - pd.Timedelta(days=1))
            if left_end >= req_start:
                fetches.append(fetcher(sym, req_start, left_end, interval))
        if req_end > ex_max:
            right_start = max(req_start, ex_max + pd.Timedelta(days=1))
            if right_start <= req_end:
                fetches.append(fetcher(sym, right_start, req_end, interval))
        if fetches:
            merged = pd.concat([existing, *fetches], copy=False).sort_index()
            merged = merged[~merged.index.duplicated(keep="last")]
        else:
            merged = fetcher(sym, req_start, req_end, interval)
    else:
        merged = fetcher(sym, req_start, req_end, interval)

    if merged.empty:
        return merged

    merged = _ensure_ohlcv_columns(merged)
    merged = _normalize_bars_index(merged)
    merged = merged.sort_index()
    merged = merged[~merged.index.duplicated(keep="last")]

    write_parquet_atomic(merged, pq_path)
    idx_min = merged.index.min()
    idx_max = merged.index.max()
    write_meta(
        meta_path,
        {
            "version": 1,
            "source": src,
            "symbol": sym,
            "interval": interval,
            "min_ts": idx_min.isoformat(),
            "max_ts": idx_max.isoformat(),
            "rows": int(len(merged)),
        },
    )

    out = merged.loc[(merged.index >= req_start) & (merged.index <= req_end)]
    return out.copy()


def _ensure_ohlcv_columns(df: pd.DataFrame) -> pd.DataFrame:
    want = ["open", "high", "low", "close", "volume"]
    lower = {str(c).lower(): c for c in df.columns}
    pick = {}
    for w in want:
        if w not in lower:
            raise ValueError(f"DataFrame missing column {w!r}; got {list(df.columns)}")
        pick[w] = lower[w]
    out = df[[pick[w] for w in want]].copy()
    out.columns = want
    return out
