"""Tests for tabular file reads."""

import os
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest

from librequant.data.tabular import read_tabular


def test_read_tabular_csv(tmp_path: Path) -> None:
    csv_path = tmp_path / "sample.csv"
    pd.DataFrame({"a": [1, 2], "b": [3, 4]}).to_csv(csv_path, index=False)
    df = read_tabular(csv_path)
    assert list(df.columns) == ["a", "b"]
    assert len(df) == 2


def test_read_tabular_xlsx(tmp_path: Path) -> None:
    xlsx_path = tmp_path / "sample.xlsx"
    pd.DataFrame({"x": [1]}).to_excel(xlsx_path, index=False)
    df = read_tabular(xlsx_path)
    assert "x" in df.columns


def test_read_tabular_json_unsupported(tmp_path: Path) -> None:
    json_path = tmp_path / "sample.json"
    json_path.write_text("{}", encoding="utf-8")
    with pytest.raises(ValueError, match="Unsupported tabular"):
        read_tabular(json_path)


def test_read_tabular_missing_file_raises(tmp_path: Path) -> None:
    missing = tmp_path / "nope.csv"
    with pytest.raises(FileNotFoundError):
        read_tabular(missing)


def test_read_tabular_relative_under_uploads(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    data_root.mkdir()
    uploads = data_root / "uploads"
    uploads.mkdir(parents=True)
    csv_path = uploads / "sample.csv"
    pd.DataFrame({"z": [9]}).to_csv(csv_path, index=False)
    with patch.dict(os.environ, {"LIBREQUANT_DATA_ROOT": str(data_root)}, clear=False):
        df = read_tabular("sample.csv")
    assert list(df.columns) == ["z"]
