# Official image does not include a Postgres DBAPI; SQLAlchemy expects psycopg2 for postgresql:// URLs.
FROM ghcr.io/mlflow/mlflow:v2.22.4

RUN pip install --no-cache-dir psycopg2-binary
