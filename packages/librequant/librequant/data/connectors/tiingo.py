"""Tiingo end-of-day prices (not yet implemented)."""

from __future__ import annotations

import pandas as pd


def fetch_tiingo_bars(
    symbol: str,
    start: pd.Timestamp,
    end: pd.Timestamp,
    interval: str,
) -> pd.DataFrame:
    raise NotImplementedError(
        "Tiingo connector is not yet implemented. "
        "Set TIINGO_API_KEY in .env.local for a future release, or use yfinance / Alpaca."
    )
