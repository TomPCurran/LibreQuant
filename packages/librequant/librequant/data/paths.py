"""Resolve data directory and user upload paths inside the Jupyter workspace."""

from __future__ import annotations

import os
from pathlib import Path


def get_credentials_env_path() -> Path:
    """
    Synced secrets file written by the Next.js app via Jupyter Contents API.

    Loaded by :func:`librequant.data.credential_env.load_data_source_secrets` on each ``get_bars`` call
    so API keys apply without restarting Docker.
    """
    home = os.environ.get("JUPYTER_USER_HOME", "/home/jovyan").strip()
    nb_root = os.environ.get("LIBREQUANT_NOTEBOOK_ROOT", "work/librequant").strip()
    return Path(home) / nb_root.replace("\\", "/") / "config" / "credentials.env"


def get_data_root() -> Path:
    """
    Root for Parquet cache and uploads: ``.../work/librequant/data`` by default.

    Override with ``LIBREQUANT_DATA_ROOT`` (absolute path). Otherwise uses
    ``JUPYTER_USER_HOME`` (default ``/home/jovyan``) + ``LIBREQUANT_NOTEBOOK_ROOT``
    (default ``work/librequant``) + ``data``.
    """
    override = os.environ.get("LIBREQUANT_DATA_ROOT", "").strip()
    if override:
        return Path(override)
    home = os.environ.get("JUPYTER_USER_HOME", "/home/jovyan").strip()
    nb_root = os.environ.get("LIBREQUANT_NOTEBOOK_ROOT", "work/librequant").strip()
    return Path(home) / nb_root.replace("\\", "/") / "data"


def _unsafe_segment(segment: str) -> bool:
    return not segment or segment in (".", "..") or "/" in segment or "\\" in segment


def resolve_data_path(relative: str) -> Path:
    """
    Resolve a path under the data root ``uploads/`` folder.

    Examples: ``"sample.csv"`` → ``.../data/uploads/sample.csv``;
    ``"uploads/sample.csv"`` → same destination.
    No ``..`` or absolute paths.
    """
    rel = relative.strip().replace("\\", "/").lstrip("/")
    parts = [p for p in rel.split("/") if p]
    if any(p == ".." for p in parts):
        raise ValueError("Path must not contain '..' segments.")
    if not parts:
        raise ValueError("Path is empty.")
    for p in parts:
        if _unsafe_segment(p):
            raise ValueError(f"Invalid path segment: {p!r}")
    if parts[0] == "uploads":
        parts = parts[1:]
    if not parts:
        raise ValueError("Path is empty.")
    full = get_data_root() / "uploads" / Path(*parts)
    try:
        full.relative_to(get_data_root())
    except ValueError as e:
        raise ValueError("Path escapes data root.") from e
    return full
