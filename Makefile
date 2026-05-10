# Copy the Next.js app under librequant/ into gemini_copy/ for sharing with AI tools.
# Requires: rsync (macOS/Linux).
#
# Skips: dotfiles/dotdirs, lockfiles & manifests, deps & build output, common secrets.
REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
LIBREQUANT := $(REPO_ROOT)/librequant
GEMINI_COPY := $(REPO_ROOT)/gemini_copy

.DEFAULT_GOAL := help

SRC := librequant

.PHONY: help up down reset logs lint test typecheck gemini-copy clean-gemini-copy \
	librequant-build compose-up prod-build prod

help:
	@echo "LibreQuant Makefile targets:"
	@echo "  help          - Show this list (default when you run make)"
	@echo "  up            - cd librequant && npm run dev:stack (Docker + Next dev on :3000)"
	@echo "  down          - docker compose down (repo root)"
	@echo "  reset         - docker compose down -v (removes named volumes)"
	@echo "  logs          - docker compose logs -f (repo root)"
	@echo "  lint          - cd librequant && npm run lint"
	@echo "  test          - cd librequant && npm run test"
	@echo "  typecheck     - cd librequant && npx tsc --noEmit"
	@echo "  gemini-copy   - rsync librequant/ into gemini_copy/ (excludes deps/build/secrets)"
	@echo "  clean-gemini-copy - rm -rf gemini_copy/"
	@echo "  compose-up    - docker compose pull && up -d (Postgres, MLflow, Jupyter)"
	@echo "  librequant-build - npm ci && npm run build in librequant/"
	@echo "  prod-build    - librequant-build + compose-up"
	@echo "  prod          - npm ci && npm run prod:stack in librequant/ (full prod stack)"

## Copy app tree for AI tooling (see header). Does not delete extra files already in gemini_copy/.
gemini-copy:
	@mkdir -p $(GEMINI_COPY)
	rsync -a $(LIBREQUANT)/ $(GEMINI_COPY)/ \
	  --exclude node_modules \
	  --exclude .next \
	  --exclude out \
	  --exclude .git \
	  --exclude gemini_copy \
	  --exclude .env.local \
	  --exclude '*.pem'

clean-gemini-copy:
	rm -rf $(GEMINI_COPY)

up:
	cd $(LIBREQUANT) && npm run dev:stack

down:
	cd $(REPO_ROOT) && docker compose down

reset:
	cd $(REPO_ROOT) && docker compose down -v

logs:
	cd $(REPO_ROOT) && docker compose logs -f

lint:
	cd $(LIBREQUANT) && npm run lint

test:
	cd $(LIBREQUANT) && npm run test

typecheck:
	cd $(LIBREQUANT) && npx tsc --noEmit

## Next.js production bundle only (no Docker).
librequant-build:
	@echo "[librequant] npm ci && npm run build…"
	cd $(LIBREQUANT) && npm ci && npm run build
	@echo "[librequant] Build finished. Serve with: cd librequant && npm start"

## Full local stack from docker-compose.yml at repo root (pull images, run detached).
compose-up:
	@echo "[docker] docker compose pull && docker compose up -d…"
	cd $(REPO_ROOT) && docker compose pull && docker compose up -d
	@echo "[docker] Postgres / MLflow / Jupyter — see librequant/README.md"

## Reproducible Next build + Jupyter only (no `next start`). Use `make prod` for the full stack.
prod-build: librequant-build compose-up
	@echo "[librequant] Build + Jupyter ready. Start Next with: cd librequant && npm start"

## Full local production stack: clean install, ensure-env (via prebuild), Docker Jupyter, production build, next start.
## Blocks until you press Ctrl+C (same as: cd librequant && npm ci && npm run prod:stack).
prod:
	@echo "[librequant] npm ci && npm run prod:stack…"
	cd $(LIBREQUANT) && npm ci && npm run prod:stack
