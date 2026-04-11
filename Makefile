# Copy the Next.js app under librequant/ into gemini_copy/ for sharing with AI tools.
# Requires: rsync (macOS/Linux).
#
# Skips: dotfiles/dotdirs, lockfiles & manifests, deps & build output, common secrets.
REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
LIBREQUANT := $(REPO_ROOT)/librequant

.DEFAULT_GOAL := gemini-copy

SRC := librequant

.PHONY: gemini-copy clean-gemini-copy help \
	librequant-build compose-up prod-build prod

help:
	@echo "Targets:"
	@echo "  make prod              - one-shot local production: npm ci + Docker Jupyter + next build + next start"
	@echo "  make librequant-build  - cd librequant/: npm ci && npm run build (Next production build only)"
	@echo "  make compose-up        - docker compose pull && up -d at repo root (Jupyter only)"
	@echo "  make prod-build        - librequant-build + compose-up (no Next server; run: cd librequant && npm start)"

## Next.js production bundle only (no Docker).
librequant-build:
	@echo "[librequant] npm ci && npm run build…"
	cd $(LIBREQUANT) && npm ci && npm run build
	@echo "[librequant] Build finished. Serve with: cd librequant && npm start"

## Jupyter stack from docker-compose.yml at repo root (pull image, run detached).
compose-up:
	@echo "[docker] docker compose pull && docker compose up -d…"
	cd $(REPO_ROOT) && docker compose pull && docker compose up -d
	@echo "[docker] Jupyter on 127.0.0.1:8888 (see librequant/README.md)"

## Reproducible Next build + Jupyter only (no `next start`). Use `make prod` for the full stack.
prod-build: librequant-build compose-up
	@echo "[librequant] Build + Jupyter ready. Start Next with: cd librequant && npm start"

## Full local production stack: clean install, ensure-env (via prebuild), Docker Jupyter, production build, next start.
## Blocks until you press Ctrl+C (same as: cd librequant && npm ci && npm run prod:stack).
prod:
	@echo "[librequant] npm ci && npm run prod:stack…"
	cd $(LIBREQUANT) && npm ci && npm run prod:stack
