"""Tests for credential loading."""

from unittest.mock import patch

from librequant.data import credential_env


def test_load_data_source_secrets_skips_when_mtime_unchanged(tmp_path, monkeypatch) -> None:
    env_file = tmp_path / "credentials.env"
    env_file.write_text("X=1\n", encoding="utf-8")
    monkeypatch.setattr(credential_env, "get_credentials_env_path", lambda: env_file)
    credential_env._credentials_file_mtime = None  # noqa: SLF001

    with patch("dotenv.load_dotenv") as load_dotenv:
        credential_env.load_data_source_secrets()
        credential_env.load_data_source_secrets()
    assert load_dotenv.call_count == 1


def test_load_data_source_secrets_reloads_when_file_changes(tmp_path, monkeypatch) -> None:
    env_file = tmp_path / "credentials.env"
    env_file.write_text("X=1\n", encoding="utf-8")
    monkeypatch.setattr(credential_env, "get_credentials_env_path", lambda: env_file)
    credential_env._credentials_file_mtime = None  # noqa: SLF001

    with patch("dotenv.load_dotenv") as load_dotenv:
        credential_env.load_data_source_secrets()
        env_file.write_text("X=2\n", encoding="utf-8")
        credential_env.load_data_source_secrets()
    assert load_dotenv.call_count == 2
