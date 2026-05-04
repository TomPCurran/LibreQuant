"""Tests for path resolution and data root helpers."""

import os
from pathlib import Path
from unittest.mock import patch

import pytest

from librequant.data.paths import get_credentials_env_path, get_data_root, resolve_data_path


def test_resolve_sample_csv_under_uploads(tmp_path: Path) -> None:
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(tmp_path / "data")}, clear=False):
        p = resolve_data_path("sample.csv")
        assert p == tmp_path / "data" / "uploads" / "sample.csv"


def test_resolve_uploads_subdir(tmp_path: Path) -> None:
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(tmp_path / "data")}, clear=False):
        p = resolve_data_path("uploads/sub/file.csv")
        assert p == tmp_path / "data" / "uploads" / "sub" / "file.csv"


def test_resolve_parent_traversal_raises(tmp_path: Path) -> None:
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(tmp_path / "data")}, clear=False):
        with pytest.raises(ValueError, match="must not contain"):
            resolve_data_path("../../../etc/passwd")


def test_resolve_uploads_with_traversal_raises(tmp_path: Path) -> None:
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(tmp_path / "data")}, clear=False):
        with pytest.raises(ValueError, match="must not contain"):
            resolve_data_path("uploads/../../../etc/passwd")


def test_resolve_empty_raises(tmp_path: Path) -> None:
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(tmp_path / "data")}, clear=False):
        with pytest.raises(ValueError, match="empty"):
            resolve_data_path("")


def test_resolve_absolute_raises(tmp_path: Path) -> None:
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(tmp_path / "data")}, clear=False):
        with pytest.raises(ValueError, match="relative"):
            resolve_data_path("/etc/passwd")


def test_get_data_root_env_override(tmp_path: Path) -> None:
    root = tmp_path / "custom"
    root.mkdir()
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(root)}, clear=False):
        assert get_data_root() == root


def test_get_credentials_env_path_from_env_vars(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("JUPYTER_USER_HOME", str(tmp_path))
    monkeypatch.setenv("LIBREQUANT_NOTEBOOK_ROOT", "work/foo")
    assert get_credentials_env_path() == tmp_path / "work" / "foo" / "config" / "credentials.env"
