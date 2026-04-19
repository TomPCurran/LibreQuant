"""Read user-uploaded CSV / Excel files."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from librequant.data.paths import resolve_data_path


def read_tabular(path: str | Path, **kwargs: object) -> pd.DataFrame:
    """
    Load a CSV or Excel file from an absolute path or a path under ``data/uploads/``.

    Parameters
    ----------
    path
        Absolute filesystem path, or a relative path passed to :func:`resolve_data_path`.
    **kwargs
        Forwarded to :func:`pandas.read_csv` or :func:`pandas.read_excel`.
    """
    p = Path(path) if isinstance(path, str) else path
    if not p.is_absolute():
        p = resolve_data_path(str(path))
    suffix = p.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(p, **kwargs)  # type: ignore[arg-type]
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(p, engine="openpyxl", **kwargs)  # type: ignore[arg-type]
    raise ValueError(f"Unsupported tabular format: {suffix!r} (use .csv or .xlsx)")
