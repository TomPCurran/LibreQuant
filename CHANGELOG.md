# Changelog

All notable changes to this repository are documented here. Summary entries reflect multi-phase work (testing foundation, documentation/CI, polish).

## [Unreleased]

### Added

- Vitest global setup with MSW (`librequant/lib/test/setup.ts`); coverage thresholds for `merge-env-local` and core `jupyter-contents` modules.
- Unit and route tests: `merge-env-local`, data-sources credentials API, Jupyter contents read/write, MLflow runs/artifacts, PyPI search; repo-root `test/smoke.sh` and `npm run test:smoke`.
- Root `LICENSE` (MIT, 2026, LibreQuant Contributors).
- GitHub Actions CI (`.github/workflows/ci.yml`): typecheck, ESLint, Vitest on `main` pushes/PRs.
- Issue templates (bug report, feature request) and pull request template under `.github/`.

### Changed

- Root `README.md` and `CONTRIBUTING.md`: quick start, architecture (Mermaid from AUDIT), ports, env pointers, npm/Makefile command tables, security/licensing links; PR/contributing checklists aligned.

### Notes

- Interactive flows (notebooks, strategies, data sources, MLflow UI) are validated manually against Docker Compose defaults (`127.0.0.1` Jupyter/MLflow/Postgres).
- `npm run test:smoke` is local-only (requires Docker and Next on `:3000`); not run in CI.
