"""Parquet cache paths and metadata for OHLCV series."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

from librequant.data.paths import get_data_root

if TYPE_CHECKING:
    import pandas as pd


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
        return cast(dict[str, Any], json.loads(meta_path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError):
        return None


def write_bytes_atomic(path: Path, data: bytes) -> None:
    """Write bytes to ``path`` via a temp file in the same directory and ``os.replace``."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".tmp_", suffix=path.suffix, dir=path.parent)
    tmp = Path(name)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.replace(tmp, path)
    except BaseException:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def write_text_atomic(path: Path, text: str, *, encoding: str = "utf-8") -> None:
    """Write ``text`` to ``path`` atomically (safe if Jupyter kernel stops mid-write)."""
    write_bytes_atomic(path, text.encode(encoding))


def write_meta(meta_path: Path, payload: dict[str, Any]) -> None:
    """Write JSON metadata atomically so a crash mid-write cannot leave a torn file."""
    text = json.dumps(payload, indent=2, sort_keys=True)
    write_text_atomic(meta_path, text, encoding="utf-8")


def write_parquet_atomic(df: pd.DataFrame, path: Path) -> None:
    """Write a Parquet file atomically so readers never see a half-written cache."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".tmp_", suffix=".parquet", dir=path.parent)
    tmp = Path(name)
    try:
        os.close(fd)
        df.to_parquet(tmp)
        os.replace(tmp, path)
    except BaseException:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        raise
