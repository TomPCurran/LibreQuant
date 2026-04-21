-- Runs only on first cluster init (empty data volume).
-- If you already had a `postgres_data` volume from before this file existed, the `mlflow`
-- database is created by the `mlflow-db-init` service in docker-compose.yml instead.
-- MLflow uses this database; app data stays in `librequant`.
CREATE DATABASE mlflow;
