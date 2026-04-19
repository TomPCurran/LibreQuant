"""Parquet cache paths and metadata for OHLCV series."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from librequant.data.paths import get_data_root


def _safe_key_part(s: str) -> str:
    return "".join(c if c.isalnum() or c in "-_." else "_" for c in s)


def cache_dir() -> Path:
    d = get_data_root() / "cache" / "ohlcv"
    d.mkdir(parents=True, exist_ok=True)
    return d


def cache_paths(source: str, symbol: str, interval: str) -> tuple[Path, Path]:
    """Return (parquet_path, meta_json_path)."""
    key = f"{_safe_key_part(source)}_{_safe_key_part(symbol)}_{_safe_key_part(interval)}"
    base = cache_dir() / key
    return base.with_suffix(".parquet"), base.with_suffix(".meta.json")


def read_meta(meta_path: Path) -> dict[str, Any] | None:
    if not meta_path.is_file():
        return None
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def write_meta(meta_path: Path, payload: dict[str, Any]) -> None:
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
