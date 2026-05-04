"""Tests for Postgres helpers (no real database)."""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

import librequant.data.postgres as postgres


def test_get_database_url_unset_returns_none() -> None:
    with patch("librequant.data.postgres.load_data_source_secrets"):
        with patch.dict(os.environ, {"LIBREQUANT_DATABASE_URL": ""}, clear=False):
            assert postgres.get_database_url() is None


def test_get_database_url_from_default_env() -> None:
    with patch("librequant.data.postgres.load_data_source_secrets"):
        with patch.dict(
            os.environ,
            {"LIBREQUANT_DATABASE_URL": "postgresql://u:p@localhost:5432/db"},
            clear=False,
        ):
            assert postgres.get_database_url() == "postgresql://u:p@localhost:5432/db"


def test_get_database_url_named_connection() -> None:
    with patch("librequant.data.postgres.load_data_source_secrets"):
        with patch.dict(
            os.environ,
            {
                "LIBREQUANT_DATABASE_URL": "postgresql://ignored/x",
                "LIBREQUANT_DB_STAGING_URL": "postgresql://a:b@host/staging",
            },
            clear=False,
        ):
            assert postgres.get_database_url("staging") == "postgresql://a:b@host/staging"


def test_read_sql_frame_no_url_raises() -> None:
    with patch("librequant.data.postgres.load_data_source_secrets"):
        with patch.dict(os.environ, {"LIBREQUANT_DATABASE_URL": ""}, clear=False):
            with pytest.raises(ValueError, match="LIBREQUANT_DATABASE_URL"):
                postgres.read_sql_frame("SELECT 1")


def test_read_sql_frame_non_postgres_raises() -> None:
    with patch("librequant.data.postgres.load_data_source_secrets"):
        with patch.dict(
            os.environ,
            {"LIBREQUANT_DATABASE_URL": "mysql://u:p@localhost/db"},
            clear=False,
        ):
            with pytest.raises(ValueError, match="only supports PostgreSQL"):
                postgres.read_sql_frame("SELECT 1")


def test_read_sql_frame_success() -> None:
    conn_cm = MagicMock()
    conn_cm.__enter__.return_value = MagicMock()
    conn_cm.__exit__.return_value = None

    expected = pd.DataFrame({"a": [1]})

    with (
        patch("librequant.data.postgres.load_data_source_secrets"),
        patch.dict(
            os.environ,
            {"LIBREQUANT_DATABASE_URL": "postgresql://u:p@localhost/db"},
            clear=False,
        ),
        patch("psycopg.connect", return_value=conn_cm),
        patch("librequant.data.postgres.pd.read_sql_query", return_value=expected) as rsq,
    ):
        out = postgres.read_sql_frame("SELECT 1", params=None)

    assert out.equals(expected)
    rsq.assert_called_once()


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgresql://localhost/db", True),
        ("POSTGRESQL://localhost/db", True),
        ("postgres://localhost/db", True),
        ("mysql://localhost/db", False),
        ("", False),
        ("  postgresql://x  ", True),
    ],
)
def test_is_postgres_url(url: str, expected: bool) -> None:
    assert postgres._is_postgres_url(url) is expected
