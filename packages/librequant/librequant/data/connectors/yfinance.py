"""yfinance OHLCV fetch."""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager

import pandas as pd


@contextmanager
def _suppress_yfinance_failed_download_log() -> Iterator[None]:
    """yfinance logs ERROR for empty sub-ranges (e.g. holidays); gap-fill can trigger benign cases.

    Keep the body minimal (only ``yf.download``) so other failures in the same ``with`` block
    are not accidentally logged at CRITICAL.
    """
    log = logging.getLogger("yfinance")
    prev = log.level
    log.setLevel(logging.CRITICAL)
    try:
        yield
    finally:
        log.setLevel(prev)


def fetch_yfinance_bars(
    symbol: str,
    start: pd.Timestamp,
    end: pd.Timestamp,
    interval: str,
) -> pd.DataFrame:
    import yfinance as yf

    with _suppress_yfinance_failed_download_log():
        raw = yf.download(
            symbol,
            start=start.strftime("%Y-%m-%d"),
            end=(end + pd.Timedelta(days=1)).strftime("%Y-%m-%d"),
            interval=interval,
            progress=False,
            auto_adjust=False,
            # Single-threaded: deterministic ordering and fewer thread quirks in notebooks;
            # slower if you later batch many symbols in one call.
            threads=False,
        )
    if raw is None or raw.empty:
        return pd.DataFrame()

    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)

    rename_map: dict[str, str] = {}
    for c in raw.columns:
        cl = str(c).lower()
        if cl in ("open", "high", "low", "close", "volume"):
            rename_map[str(c)] = cl
    if len(rename_map) < 4:
        return pd.DataFrame()
    out = raw[[k for k in rename_map]].rename(columns=rename_map)
    out.index = pd.to_datetime(out.index, utc=True).tz_convert(None)
    out = out.sort_index()
    return out
