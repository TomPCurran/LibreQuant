"""Polygon.io aggregates (not yet implemented)."""

from __future__ import annotations

import pandas as pd


def fetch_polygon_bars(
    symbol: str,
    start: pd.Timestamp,
    end: pd.Timestamp,
    interval: str,
) -> pd.DataFrame:
    raise NotImplementedError(
        "Polygon connector is not implemented yet. "
        "Set POLYGON_API_KEY in .env.local and use a future release, or use yfinance / Alpaca."
    )
