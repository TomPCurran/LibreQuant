# Pre-installs librequant dependency pins so container start only runs editable
# `pip install /opt/librequant[postgres,mlflow]` (fast when wheels match).
FROM quay.io/jupyter/scipy-notebook:latest

USER root

COPY packages/librequant/pyproject.toml /tmp/librequant-pyproject.toml

RUN pip install --no-cache-dir -q pip setuptools wheel \
  && python - <<'PY'
import subprocess
import sys
import tomllib
from pathlib import Path

p = tomllib.loads(Path("/tmp/librequant-pyproject.toml").read_text())
deps = p["project"]["dependencies"]
opt = p["project"]["optional-dependencies"]
reqs = deps + opt["postgres"] + opt["mlflow"]
subprocess.check_call(
    [sys.executable, "-m", "pip", "install", "--no-cache-dir", "-q", *reqs],
)
PY

USER ${NB_UID}
