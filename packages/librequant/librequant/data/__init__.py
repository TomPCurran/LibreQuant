"""Market data and tabular file helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from librequant.data.bars import get_bars
from librequant.data.paths import resolve_data_path
from librequant.data.credential_env import load_data_source_secrets
from librequant.data.tabular import read_tabular

if TYPE_CHECKING:
    from librequant.data.postgres import read_sql_frame as read_sql_frame
    from librequant.data.postgres import get_database_url as get_database_url

__all__ = [
    "get_bars",
    "get_database_url",
    "load_data_source_secrets",
    "read_sql_frame",
    "read_tabular",
    "resolve_data_path",
]


def __getattr__(name: str) -> Any:
    if name == "get_database_url":
        from librequant.data.postgres import get_database_url

        return get_database_url
    if name == "read_sql_frame":
        from librequant.data.postgres import read_sql_frame

        return read_sql_frame
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
