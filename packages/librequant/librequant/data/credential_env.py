"""Load synced credentials from the Jupyter workspace (no Docker restart required)."""

from __future__ import annotations

from librequant.data.paths import get_credentials_env_path


def load_data_source_secrets() -> None:
    """
    Load ``config/credentials.env`` into ``os.environ`` (override=True).

    The Next.js Data sources page writes this file after saving ``.env.local``, so new keys are
    visible on the next ``get_bars()`` call without restarting the Jupyter container.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    p = get_credentials_env_path()
    if p.is_file():
        load_dotenv(p, override=True)
