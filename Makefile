# Copy the Next.js app under librequant/ into gemini_copy/ for sharing with AI tools.
# Requires: rsync (macOS/Linux).
#
# Skips: dotfiles/dotdirs, lockfiles & manifests, deps & build output, common secrets.
.DEFAULT_GOAL := gemini-copy

GEMINI_DIR := gemini_copy
SRC := librequant

.PHONY: gemini-copy clean-gemini-copy help

help:
	@echo "Targets:"
	@echo "  make gemini-copy      - sync $(SRC)/ -> $(GEMINI_DIR)/ (see excludes in Makefile)"
	@echo "  make clean-gemini-copy - rm -rf $(GEMINI_DIR)/"

gemini-copy:
	@mkdir -p $(GEMINI_DIR)
	rsync -a --delete --delete-excluded \
		--exclude='.*/' \
		--exclude='.*' \
		--exclude='node_modules/' \
		--exclude='.next/' \
		--exclude='out/' \
		--exclude='dist/' \
		--exclude='build/' \
		--exclude='.turbo/' \
		--exclude='coverage/' \
		--exclude='.vercel/' \
		--exclude='.cursor/' \
		--exclude='.env' \
		--exclude='.env.*' \
		--exclude='*.pem' \
		--exclude='*.key' \
		--exclude='*.p12' \
		--exclude='id_rsa' \
		--exclude='id_rsa.pub' \
		--exclude='*.keystore' \
		--exclude='credentials.json' \
		--exclude='service-account*.json' \
		--exclude='package.json' \
		--exclude='package-lock.json' \
		--exclude='pnpm-lock.yaml' \
		--exclude='yarn.lock' \
		--exclude='bun.lockb' \
		--exclude='npm-debug.log*' \
		--exclude='yarn-error.log' \
		--exclude='pnpm-debug.log*' \
		--exclude='*.log' \
		--exclude='.DS_Store' \
		--exclude='*.tsbuildinfo' \
		--exclude='next-env.d.ts' \
		$(SRC)/ $(GEMINI_DIR)/

clean-gemini-copy:
	rm -rf $(GEMINI_DIR)
