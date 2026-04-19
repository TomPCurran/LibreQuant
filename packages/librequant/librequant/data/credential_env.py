"""Load synced credentials from the Jupyter workspace (no Docker restart required)."""

from __future__ import annotations

import threading

from librequant.data.paths import get_credentials_env_path

# Skip re-reading when the file on disk is unchanged (``get_bars`` calls this often).
_credentials_file_mtime: float | None = None
_load_lock = threading.Lock()


def load_data_source_secrets() -> None:
    """
    Load ``config/credentials.env`` into ``os.environ`` (override=True).

    The Next.js Data sources page writes this file after saving ``.env.local``, so new keys are
    visible on the next ``get_bars()`` call without restarting the Jupyter container.

    Re-loads only when the credentials file's modification time changes, to avoid repeated
    disk I/O on hot paths.
    """
    global _credentials_file_mtime
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    with _load_lock:
        p = get_credentials_env_path()
        if not p.is_file():
            _credentials_file_mtime = None
            return
        try:
            mtime = p.stat().st_mtime
        except OSError:
            return
        if _credentials_file_mtime == mtime:
            return
        load_dotenv(p, override=True)
        _credentials_file_mtime = mtime
