"""yfinance OHLCV fetch."""

from __future__ import annotations

import pandas as pd


def fetch_yfinance_bars(
    symbol: str,
    start: pd.Timestamp,
    end: pd.Timestamp,
    interval: str,
) -> pd.DataFrame:
    import yfinance as yf

    raw = yf.download(
        symbol,
        start=start.strftime("%Y-%m-%d"),
        end=(end + pd.Timedelta(days=1)).strftime("%Y-%m-%d"),
        interval=interval,
        progress=False,
        auto_adjust=False,
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
