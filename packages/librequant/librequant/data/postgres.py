"""PostgreSQL query helpers (optional ``psycopg`` extra).

``get_database_url`` reads connection strings from the environment (default:
``LIBREQUANT_DATABASE_URL``; named: ``LIBREQUANT_DB_*_URL``). Named URLs may use any scheme
you store; ``read_sql_frame`` only accepts PostgreSQL URLs.

Connection attempts use ``connect_timeout`` (default 15 seconds, override with
``LIBREQUANT_PG_CONNECT_TIMEOUT``) so notebooks fail fast if Postgres is unreachable
(e.g. Docker service not ready).
"""

from __future__ import annotations

import os
import warnings
from typing import Any

from librequant.data.credential_env import load_data_source_secrets

_DEFAULT_PG_CONNECT_TIMEOUT_SEC = 15


def _is_postgres_url(url: str) -> bool:
    u = url.strip().lower()
    return u.startswith("postgresql://") or u.startswith("postgres://")


def _pg_connect_timeout_sec() -> int:
    raw = os.environ.get("LIBREQUANT_PG_CONNECT_TIMEOUT", "").strip()
    if not raw:
        return _DEFAULT_PG_CONNECT_TIMEOUT_SEC
    try:
        return max(1, int(raw))
    except ValueError:
        return _DEFAULT_PG_CONNECT_TIMEOUT_SEC


def _env_key_for_connection(connection: str | None) -> str | None:
    """Return ``LIBREQUANT_DB_{SLUG}_URL`` for a named connection, or ``None`` for the default URL."""
    c = (connection or "").strip()
    if not c or c.lower() == "default":
        return None
    slug = c.upper().replace(" ", "_")
    return f"LIBREQUANT_DB_{slug}_URL"


def get_database_url(connection: str | None = None) -> str | None:
    """
    Return a database connection URL string from the environment.

    * ``connection`` is ``None``, empty, or ``\"default\"`` → ``LIBREQUANT_DATABASE_URL`` (Docker Compose PostgreSQL).
    * Otherwise ``connection`` is a slug (e.g. ``\"STAGING\"``) → ``LIBREQUANT_DB_{SLUG}_URL`` (any URL your app stores).

    The returned string is not validated here; use ``read_sql_frame`` only for PostgreSQL URLs.
    """
    load_data_source_secrets()
    key = _env_key_for_connection(connection)
    if key is None:
        v = os.environ.get("LIBREQUANT_DATABASE_URL", "").strip()
        return v or None
    v = os.environ.get(key, "").strip()
    return v or None


def read_sql_frame(
    query: str,
    params: list[Any] | dict[str, Any] | None = None,
    *,
    connection: str | None = None,
) -> Any:
    """
    Run a parameterized SQL query and return a DataFrame (PostgreSQL only).

    Uses ``pandas.read_sql_query`` with a ``psycopg`` connection. Pass ``params`` for bind
    parameters (never interpolate untrusted strings into ``query``).

    For non-PostgreSQL URLs stored under ``LIBREQUANT_DB_*_URL``, use ``get_database_url`` and
    the appropriate driver instead.
    """
    url = get_database_url(connection)
    if not url:
        key = _env_key_for_connection(connection)
        if key is not None:
            raise ValueError(
                f"{key} is not set. Add it under Data sources → Database connections, or export it."
            )
        raise ValueError(
            "LIBREQUANT_DATABASE_URL is not set. In Docker, Compose sets it for Jupyter; "
            "on the host, export it to match postgresql://USER:PASSWORD@127.0.0.1:PORT/librequant "
            "(PORT is POSTGRES_HOST_PORT from Docker Compose, default 5432)."
        )
    if not _is_postgres_url(url):
        raise ValueError(
            "read_sql_frame only supports PostgreSQL URLs (postgresql:// or postgres://). "
            "Use get_database_url(...) with another driver for other database types."
        )
    import pandas as pd
    import psycopg

    timeout = _pg_connect_timeout_sec()
    with psycopg.connect(url, connect_timeout=timeout) as conn:
        # pandas warns on psycopg 3 connections even though read_sql_query works; SQLAlchemy is optional.
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="pandas only supports SQLAlchemy",
                category=UserWarning,
            )
            return pd.read_sql_query(query, conn, params=params)
