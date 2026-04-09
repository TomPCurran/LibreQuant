# Delegate to the repo-root Makefile (run `make` from here or from ..).
REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/..)

.PHONY: gemini-copy clean-gemini-copy help

.DEFAULT_GOAL := gemini-copy

gemini-copy clean-gemini-copy help:
	@$(MAKE) -C $(REPO_ROOT) $@
