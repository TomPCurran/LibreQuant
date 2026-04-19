"""Alpaca Market Data v2 stock bars."""

from __future__ import annotations

import os
from datetime import UTC, datetime

import pandas as pd
import requests

_ALPACA_DATA = "https://data.alpaca.markets/v2"


def _timeframe_for_interval(interval: str) -> str:
    m = interval.strip().lower()
    if m in ("1d", "1day", "day"):
        return "1Day"
    if m in ("1h", "1hour", "60m", "60min"):
        return "1Hour"
    if m in ("15m", "15min"):
        return "15Min"
    if m in ("5m", "5min"):
        return "5Min"
    if m in ("1m", "1min"):
        return "1Min"
    return "1Day"


def fetch_alpaca_bars(
    symbol: str,
    start: pd.Timestamp,
    end: pd.Timestamp,
    interval: str,
) -> pd.DataFrame:
    key = os.environ.get("ALPACA_API_KEY", "").strip()
    secret = os.environ.get("ALPACA_SECRET_KEY", "").strip()
    if not key or not secret:
        raise ValueError(
            "Alpaca requires ALPACA_API_KEY and ALPACA_SECRET_KEY in the environment "
            "(e.g. via .env.local and Docker env_file)."
        )

    timeframe = _timeframe_for_interval(interval)
    start_dt = datetime.fromtimestamp(start.timestamp(), tz=UTC)
    end_dt = datetime.fromtimestamp(end.timestamp(), tz=UTC)

    url = f"{_ALPACA_DATA}/stocks/{symbol.upper()}/bars"
    base_params: dict = {
        "timeframe": timeframe,
        "start": start_dt.isoformat().replace("+00:00", "Z"),
        "end": end_dt.isoformat().replace("+00:00", "Z"),
        "limit": 10000,
        "adjustment": "raw",
        "feed": os.environ.get("ALPACA_DATA_FEED", "iex").strip() or "iex",
    }
    headers = {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
    }

    rows: list[dict] = []
    page_token: str | None = None
    while True:
        params = dict(base_params)
        if page_token:
            params["page_token"] = page_token
        r = requests.get(url, params=params, headers=headers, timeout=60)
        r.raise_for_status()
        data = r.json()
        for b in data.get("bars") or []:
            rows.append(b)
        page_token = data.get("next_page_token")
        if not page_token:
            break

    if not rows:
        return pd.DataFrame()

    idx = []
    ohlcv = []
    for b in rows:
        t = b.get("t")
        if not t:
            continue
        idx.append(pd.Timestamp(t))
        ohlcv.append(
            [
                float(b["o"]),
                float(b["h"]),
                float(b["l"]),
                float(b["c"]),
                float(b.get("v", 0)),
            ]
        )
    out = pd.DataFrame(
        ohlcv,
        index=pd.DatetimeIndex(idx, name="timestamp"),
        columns=["open", "high", "low", "close", "volume"],
    )
    if out.index.tz is not None:
        out.index = out.index.tz_convert(None)
    out = out.sort_index()
    out = out[~out.index.duplicated(keep="last")]
    return out
